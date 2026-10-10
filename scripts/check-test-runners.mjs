#!/usr/bin/env node
/**
 * Verifies that every test file belongs to exactly one runner.
 *
 * Native runner: the explicit list in test/runners.json.
 * Jest runner:   every other *.test.ts under test/ (jest.config.js excludes the
 *                native list and matches **\/*.test.ts).
 *
 * Fails when a native entry is missing, duplicated, outside test/, or not a
 * *.test.ts file, so fixture and helper modules cannot be executed as tests.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { native } = JSON.parse(readFileSync(path.join(projectRoot, 'test', 'runners.json'), 'utf8'));
const problems = [];

const seen = new Set();
for (const file of native) {
  if (seen.has(file)) problems.push(`duplicate native entry: ${file}`);
  seen.add(file);
  if (!file.startsWith('test/') || !file.endsWith('.test.ts')) {
    problems.push(`native entry is not test/**/*.test.ts: ${file}`);
  }
  if (!existsSync(path.join(projectRoot, file))) {
    problems.push(`native entry does not exist: ${file}`);
  }
}

const discovered = readdirSync(path.join(projectRoot, 'test'), { recursive: true })
  .map((entry) => entry.split(path.sep).join('/'))
  .filter((entry) => entry.endsWith('.test.ts'))
  .map((entry) => `test/${entry}`);

const jestFiles = discovered.filter((file) => !seen.has(file));

if (problems.length > 0) {
  console.error('Test runner assignment is invalid:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`Test runner assignment OK: ${native.length} native, ${jestFiles.length} jest, ${discovered.length} total.`);
