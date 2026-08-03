import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  await cp(path.join(projectRoot, 'package-lock.json'), path.join(stagePath, 'package-lock.json'));
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
