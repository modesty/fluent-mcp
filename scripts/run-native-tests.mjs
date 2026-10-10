#!/usr/bin/env node
/**
 * Runs test files with the native Node test runner.
 *
 * Usage:
 *   node scripts/run-native-tests.mjs                          # every test in test/runners.json
 *   node scripts/run-native-tests.mjs test/config.test.ts      # focused run (any test/**\/*.test.ts)
 *   node scripts/run-native-tests.mjs --coverage               # coverage report -> coverage/lcov.info
 *   node scripts/run-native-tests.mjs --watch [test files...]  # re-stage and re-run on change
 *
 * Test-file ownership is declared in test/runners.json. Explicit file arguments
 * run directly, so a file can be checked before it joins the manifest. Set
 * NATIVE_TEST_STAGE to keep concurrent runs in separate directories under
 * .test-build/.
 *
 * Experimental module mocks and experimental coverage are enabled only for this
 * test process. Coverage uses source maps, so results map back to src/*.ts.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { stageTests, tscBin } from './stage-tests.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(projectRoot, 'test', 'runners.json'), 'utf8'));

const args = process.argv.slice(2);
const coverage = args.includes('--coverage');
const watch = args.includes('--watch');
const requested = args
  .filter((arg) => !arg.startsWith('--'))
  .map((file) => path.posix.normalize(file.replaceAll('\\', '/')));
const selected = requested.length > 0 ? requested : manifest.native;

if (selected.length === 0) {
  console.log('No tests are assigned to the native runner.');
  process.exit(0);
}

for (const file of selected) {
  if (!file.startsWith('test/') || !file.endsWith('.test.ts')) {
    console.error(`Not a test file under test/: ${file}`);
    process.exit(1);
  }
}

const stageRoot = stageTests(selected, process.env.NATIVE_TEST_STAGE || 'native');
const compiled = selected.map((file) => path.join(stageRoot, file.replace(/\.ts$/, '.js')));

const nodeArgs = ['--experimental-test-module-mocks'];
if (coverage) {
  // Only files the tests load are reported. Test code and fixtures are excluded
  // so the report covers the product source.
  nodeArgs.push(
    '--enable-source-maps',
    '--experimental-test-coverage',
    '--test-coverage-exclude=test/**',
    '--test-coverage-exclude=**/*.test.js',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=lcov',
    `--test-reporter-destination=${ensureCoverageFile()}`
  );
}

if (watch) {
  watchTests(nodeArgs, compiled);
} else {
  const result = spawnSync(process.execPath, [...nodeArgs, '--test', ...compiled], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

/** @returns {string} absolute path of coverage/lcov.info, creating its directory */
function ensureCoverageFile() {
  const dir = path.join(projectRoot, 'coverage');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, 'lcov.info');
}

/**
 * Watch mode: TypeScript recompiles into the stage directory while the Node test
 * runner re-executes the affected test files. Both children stop with this process.
 */
function watchTests(baseNodeArgs, compiledFiles) {
  const compiler = spawn(
    process.execPath,
    [tscBin, '-p', path.join(stageRoot, 'tsconfig.json'), '--watch', '--preserveWatchOutput'],
    { cwd: projectRoot, stdio: 'inherit' }
  );
  const runner = spawn(
    process.execPath,
    [...baseNodeArgs, '--test', '--watch', ...compiledFiles],
    { cwd: projectRoot, stdio: 'inherit' }
  );
  const stop = () => {
    compiler.kill();
    runner.kill();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  runner.on('exit', (code) => {
    compiler.kill();
    process.exit(code ?? 1);
  });
}
