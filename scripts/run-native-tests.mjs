#!/usr/bin/env node
/**
 * Runs test files with the native Node test runner.
 *
 * Usage:
 *   node scripts/run-native-tests.mjs                       # every native test in test/runners.json
 *   node scripts/run-native-tests.mjs test/config.test.ts   # focused run (any test/**\/*.test.ts)
 *
 * Test-file ownership for `npm test` is declared in test/runners.json. Explicit
 * arguments run directly, so a file can be checked before it is added to the
 * manifest. Set NATIVE_TEST_STAGE to keep concurrent runs in separate staging
 * directories under .test-build/.
 *
 * Experimental module mocks are enabled only for this test process.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { stageTests } from './stage-tests.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(projectRoot, 'test', 'runners.json'), 'utf8'));

const requested = process.argv.slice(2).map((file) => path.posix.normalize(file.replaceAll('\\', '/')));
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

const result = spawnSync(
  process.execPath,
  ['--experimental-test-module-mocks', '--test', ...compiled],
  { cwd: projectRoot, stdio: 'inherit' }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
