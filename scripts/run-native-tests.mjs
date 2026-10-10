#!/usr/bin/env node
/**
 * Runs the test files assigned to the native Node test runner.
 *
 * Usage:
 *   node scripts/run-native-tests.mjs                       # every native test
 *   node scripts/run-native-tests.mjs test/config.test.ts   # focused run
 *
 * Test-file ownership is declared in test/runners.json. Each listed TypeScript
 * file is compiled by scripts/stage-tests.mjs and executed from .test-build/.
 * Experimental module mocks are enabled only for this test process.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { stageTests } from './stage-tests.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(projectRoot, 'test', 'runners.json'), 'utf8'));
const nativeTests = manifest.native;

const requested = process.argv.slice(2).map((file) => path.posix.normalize(file.replaceAll('\\', '/')));
const unknown = requested.filter((file) => !nativeTests.includes(file));
if (unknown.length > 0) {
  console.error(`Not assigned to the native runner in test/runners.json: ${unknown.join(', ')}`);
  process.exit(1);
}
const selected = requested.length > 0 ? requested : nativeTests;

if (selected.length === 0) {
  console.log('No tests are assigned to the native runner.');
  process.exit(0);
}

const stageRoot = stageTests();
const compiled = selected.map((file) =>
  path.join(stageRoot, file.replace(/\.ts$/, '.js'))
);

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
