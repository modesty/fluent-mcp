import { execFileSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PUBLIC_REGISTRY = 'https://registry.npmjs.org';

/**
 * The environment for the staged npm install, without any inherited registry
 * setting. npm reads `npm_config_*` (any case) above every config file, so an
 * inherited `npm_config_registry` or `npm_config_@scope:registry` would win over
 * the bundle's own config. Other npm settings (a proxy, a CA file) are kept.
 * @param env The inherited environment
 * @returns A copy without registry keys
 */
function withoutInheritedRegistries(env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !/^npm_config_(?:.*:)?registry$/i.test(key)));
}

/**
 * Fail unless every package in the generated lockfile was fetched from the
 * public registry: the proof the install used it, whatever config npm found.
 * @param lockfilePath The package-lock.json the staged install wrote
 */
async function assertResolvedFromPublicRegistry(lockfilePath) {
  const { packages } = JSON.parse(await readFile(lockfilePath, 'utf8'));
  const elsewhere = Object.entries(packages)
    .filter(([, entry]) => entry.resolved && !entry.resolved.startsWith(`${PUBLIC_REGISTRY}/`))
    .map(([name, entry]) => `${name} (${entry.resolved})`);
  if (elsewhere.length > 0) {
    throw new Error(`${elsewhere.length} bundled packages were not resolved from ${PUBLIC_REGISTRY}: ${elsewhere.slice(0, 5).join(', ')}`);
  }
}

/**
 * Why the staged install resolves fresh instead of replaying package-lock.json:
 *
 * `npm ci --omit=dev` keeps the lockfile's tree *placement*, and that tree was
 * built with our devDependencies in it. `@servicenow/isomorphic-rollup` (an SDK
 * dependency) calls `require('rollup')` at runtime but declares `rollup` only as a
 * devDependency of its own. In the dev tree our own devDependency `rollup` holds
 * the root slot, so the SDK's pinned copy stays nested under
 * `@servicenow/sdk-repack`, and once our devDependencies are omitted nothing at the
 * root satisfies that require. The bundled SDK then failed every build and query
 * with "Cannot find module 'rollup'".
 *
 * A consumer of the npm package never sees our devDependencies or our lockfile, so
 * npm hoists the SDK's `rollup` to the root there. The bundle now gets that same
 * resolution: a package.json without devDependencies, installed from the public
 * registry with no lockfile. The lockfile that install writes ships in the bundle
 * as the record of exactly what it contains. The trade-off is that transitive
 * versions are those of the day the bundle is built, as for an npm install.
 */

/**
 * `mcpb pack` drops every file matching its EXCLUDE_PATTERNS
 * (`@anthropic-ai/mcpb` `dist/node/files.js`), among them `*.d.ts` and
 * `package-lock.json`. The SDK's declarations are not build artifacts here: a
 * Fluent build type-checks against them (`Now` is a global declared in
 * `@servicenow/sdk-core`), so without them the bundled SDK fails every build with
 * TS2708 "Cannot use namespace 'Now' as a value". The lockfile is the dependency
 * record promised above. `.mcpbignore` patterns are added after the defaults and
 * honor gitignore `!` negation; `.mcpbignore` itself never ships.
 */
const MCPB_IGNORE = [
  '!node_modules/@servicenow/**/*.d.ts',
  '!/package-lock.json',
];

/**
 * Build a tiny Fluent project with the SDK of an extracted bundle, the way a
 * bundle user's first build_fluent_app runs it. The fixture has no SDK of its
 * own, only a link to the bundle's node_modules, so a project that installs its
 * own SDK cannot mask a file the archive lacks. A missing runtime module or
 * declaration anywhere on the build path (both above) fails here.
 * @param bundle A directory holding the unpacked .mcpb archive
 */
async function assertBundledSdkBuilds(bundle) {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'fluent-mcpb-guard-'));
  try {
    await writeFile(path.join(fixture, 'package.json'), `${JSON.stringify({ name: 'mcpb-guard', version: '0.0.1' }, null, 2)}\n`);
    await writeFile(path.join(fixture, 'now.config.json'), `${JSON.stringify({ scope: 'x_mcpb_guard', scopeId: '0'.repeat(32), name: 'MCPB guard' }, null, 2)}\n`);
    await mkdir(path.join(fixture, 'src', 'fluent'), { recursive: true });
    await writeFile(
      path.join(fixture, 'src', 'fluent', 'guard.now.ts'),
      "import { Role } from '@servicenow/sdk/core'\n\nRole({ $id: Now.ID['guard_role'], name: 'x_mcpb_guard.user' })\n"
    );
    await symlink(path.join(bundle, 'node_modules'), path.join(fixture, 'node_modules'), 'junction');
    const cli = path.join(bundle, 'node_modules', '@servicenow', 'sdk', 'bin', 'index.js');
    console.log('Building a fixture project with the bundled SDK...');
    execFileSync(process.execPath, [cli, 'build'], { cwd: fixture, stdio: 'inherit', env: { ...process.env, NO_TELEMETRY: '1' } });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const outputPath = path.join(projectRoot, `${packageJson.name.replace(/^@[^/]+\//, '')}-${packageJson.version}.mcpb`);
const stagePath = await mkdtemp(path.join(os.tmpdir(), 'fluent-mcpb-'));
const unpackPath = await mkdtemp(path.join(os.tmpdir(), 'fluent-mcpb-unpacked-'));
const npmConfigPath = await mkdtemp(path.join(os.tmpdir(), 'fluent-mcpb-npmrc-'));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const require = createRequire(import.meta.url);
const mcpbPackageRoot = path.resolve(path.dirname(require.resolve('@anthropic-ai/mcpb')), '..');
const mcpbCli = path.join(mcpbPackageRoot, 'dist', 'cli', 'cli.js');

try {
  await cp(path.join(projectRoot, 'manifest.json'), path.join(stagePath, 'manifest.json'));
  // Production dependencies only: see the note at the top of this file.
  const stagedPackageJson = Object.fromEntries(Object.entries(packageJson).filter(([key]) => key !== 'devDependencies'));
  await writeFile(path.join(stagePath, 'package.json'), `${JSON.stringify(stagedPackageJson, null, 2)}\n`);
  await cp(path.join(projectRoot, 'dist'), path.join(stagePath, 'dist'), { recursive: true });
  await cp(path.join(projectRoot, 'res'), path.join(stagePath, 'res'), { recursive: true });
  await cp(path.join(projectRoot, 'license.txt'), path.join(stagePath, 'license.txt'));
  // The user and global npmrc are replaced (a scoped registry in either would
  // redirect that scope), and the registry is also passed on the command line,
  // which outranks the environment. Neither file lives in the staging directory.
  const npmUserConfig = path.join(npmConfigPath, 'user-npmrc');
  const npmGlobalConfig = path.join(npmConfigPath, 'global-npmrc');
  await writeFile(npmUserConfig, `registry=${PUBLIC_REGISTRY}/\n`);
  await writeFile(npmGlobalConfig, '');
  // shell:true passes argv through cmd.exe; preserve temp paths containing spaces.
  const shellPath = (file) => (process.platform === 'win32' ? `"${file}"` : file);

  console.log(`Installing production dependencies from ${PUBLIC_REGISTRY} in the bundle staging directory...`);
  execFileSync(npmCommand, [
    'install',
    '--omit=dev',
    '--ignore-scripts',
    `--registry=${PUBLIC_REGISTRY}/`,
    '--userconfig',
    shellPath(npmUserConfig),
    '--globalconfig',
    shellPath(npmGlobalConfig),
    '--no-audit',
    '--no-fund',
  ], {
    cwd: stagePath,
    // Node 20.12+ rejects launching .cmd files without a shell on Windows.
    // The command and every argument are fixed by this script, so shell use
    // is bounded to the npm bootstrap invocation and has no user input.
    shell: process.platform === 'win32',
    stdio: 'inherit',
    env: {
      ...withoutInheritedRegistries(process.env),
      npm_config_allow_scripts: '',
      npm_config_ignore_scripts: 'true',
      npm_config_local_prefix: stagePath,
      npm_config_userconfig: npmUserConfig,
      npm_config_globalconfig: npmGlobalConfig,
    },
  });
  await assertResolvedFromPublicRegistry(path.join(stagePath, 'package-lock.json'));

  await writeFile(path.join(stagePath, '.mcpbignore'), `${MCPB_IGNORE.join('\n')}\n`);

  console.log(`Packing ${outputPath}...`);
  execFileSync(process.execPath, [mcpbCli, 'pack', stagePath, outputPath], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  // Check what ships, not what was staged: the archive is the staging directory
  // after MCPB's exclusions. A failed check removes the bundle.
  try {
    execFileSync(process.execPath, [mcpbCli, 'unpack', outputPath, unpackPath], { cwd: projectRoot, stdio: 'inherit' });
    await access(path.join(unpackPath, 'package-lock.json')).catch(() => {
      throw new Error('The bundle does not contain package-lock.json.');
    });
    await assertBundledSdkBuilds(unpackPath);
  } catch (error) {
    await rm(outputPath, { force: true });
    throw error;
  }
} finally {
  await rm(stagePath, { recursive: true, force: true });
  await rm(unpackPath, { recursive: true, force: true });
  await rm(npmConfigPath, { recursive: true, force: true });
}
