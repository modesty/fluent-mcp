import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PUBLIC_REGISTRY = 'https://registry.npmjs.org';

/**
 * npm registry tarball URLs end with `<name>/-/<file>.tgz`, where `<name>` may
 * be scoped. A mirror registry records its own host *and* repository path prefix
 * (e.g. `https://<mirror>/repository/npm-all/<name>/-/<file>.tgz`), so npm's own
 * `replace-registry-host` config is not enough: it swaps the host and leaves the
 * prefix behind, producing a 404 against the public registry.
 */
const REGISTRY_TARBALL_TAIL = /\/((?:@[^/]+\/)?[^/]+\/-\/[^/]+\.tgz)$/;

/**
 * Rewrite every `resolved` tarball URL in a parsed lockfile to the public
 * registry, in place.
 *
 * A lockfile records whichever registry produced it, so a contributor behind a
 * private mirror commits mirror URLs. `npm ci` replays those URLs verbatim, and
 * npm classifies a `resolved` host that disagrees with the configured registry
 * as a `remote` fetch — which it refuses (`EALLOWREMOTE`). Normalizing the
 * staged copy makes the bundle reproducible from any contributor's lockfile
 * without touching the committed one. Only the location changes: the `integrity`
 * hashes are left untouched, so npm still verifies every tarball's contents.
 *
 * @param node A lockfile value to walk (the parsed lockfile, or any nested part).
 * @param unresolvable Collects `resolved` values that are not registry tarballs.
 * @returns The number of URLs rewritten.
 */
function normalizeLockfileRegistry(node, unresolvable) {
  let rewritten = 0;

  if (Array.isArray(node)) {
    for (const item of node) rewritten += normalizeLockfileRegistry(item, unresolvable);
    return rewritten;
  }
  if (node === null || typeof node !== 'object') return rewritten;

  for (const [key, value] of Object.entries(node)) {
    if (key !== 'resolved' || typeof value !== 'string') {
      rewritten += normalizeLockfileRegistry(value, unresolvable);
      continue;
    }
    if (value.startsWith(`${PUBLIC_REGISTRY}/`)) continue;

    const tail = value.match(REGISTRY_TARBALL_TAIL);
    if (!tail) {
      // A git/file/arbitrary-URL dependency cannot be served by the public
      // registry at all; report it rather than emit a URL npm will reject.
      unresolvable.push(value);
      continue;
    }
    node[key] = `${PUBLIC_REGISTRY}/${tail[1]}`;
    rewritten += 1;
  }

  return rewritten;
}

const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const outputPath = path.join(projectRoot, `${packageJson.name.replace(/^@[^/]+\//, '')}-${packageJson.version}.mcpb`);
const stagePath = await mkdtemp(path.join(os.tmpdir(), 'fluent-mcpb-'));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const require = createRequire(import.meta.url);
const mcpbPackageRoot = path.resolve(path.dirname(require.resolve('@anthropic-ai/mcpb')), '..');
const mcpbCli = path.join(mcpbPackageRoot, 'dist', 'cli', 'cli.js');

try {
  await cp(path.join(projectRoot, 'manifest.json'), path.join(stagePath, 'manifest.json'));
  await cp(path.join(projectRoot, 'package.json'), path.join(stagePath, 'package.json'));
  const lockfile = JSON.parse(await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8'));
  const unresolvable = [];
  const rewritten = normalizeLockfileRegistry(lockfile, unresolvable);
  if (unresolvable.length > 0) {
    throw new Error(
      `package-lock.json contains ${unresolvable.length} dependency source(s) the public npm registry cannot serve, ` +
      `so the bundle cannot be built reproducibly:\n  ${unresolvable.join('\n  ')}`
    );
  }
  if (rewritten > 0) {
    console.log(`Normalized ${rewritten} lockfile tarball URL(s) to ${PUBLIC_REGISTRY} for the staged install.`);
  }
  await writeFile(path.join(stagePath, 'package-lock.json'), `${JSON.stringify(lockfile, null, 2)}\n`);
  await cp(path.join(projectRoot, 'dist'), path.join(stagePath, 'dist'), { recursive: true });
  await cp(path.join(projectRoot, 'res'), path.join(stagePath, 'res'), { recursive: true });
  await cp(path.join(projectRoot, 'license.txt'), path.join(stagePath, 'license.txt'));
  const npmUserConfig = path.join(stagePath, '.bundle-npmrc');
  // shell:true passes argv through cmd.exe; preserve temp paths containing spaces.
  const npmUserConfigArg = process.platform === 'win32' ? `"${npmUserConfig}"` : npmUserConfig;
  await writeFile(npmUserConfig, 'registry=https://registry.npmjs.org\n');

  console.log('Installing production dependencies in the bundle staging directory...');
  execFileSync(npmCommand, [
    'ci',
    '--omit=dev',
    '--ignore-scripts',
    '--userconfig',
    npmUserConfigArg,
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
      ...process.env,
      npm_config_allow_scripts: '',
      npm_config_ignore_scripts: 'true',
      npm_config_local_prefix: stagePath,
      npm_config_userconfig: npmUserConfig,
    },
  });

  // This config is only needed for npm ci; do not ship it in the MCPB archive.
  await rm(npmUserConfig, { force: true });

  console.log(`Packing ${outputPath}...`);
  execFileSync(process.execPath, [mcpbCli, 'pack', stagePath, outputPath], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
} finally {
  await rm(stagePath, { recursive: true, force: true });
}
