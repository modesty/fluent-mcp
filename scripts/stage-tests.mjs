#!/usr/bin/env node
/**
 * Compiles src/ and test/ into .test-build/ for the native Node test runner and
 * stages the package metadata and resources that src/config.ts resolves from its
 * own module location.
 *
 * Layout produced (mirrors the published package root):
 *   .test-build/package.json   copy of the root package.json ("type": "module")
 *   .test-build/res/           copy of the root res/ tree
 *   .test-build/src/...        compiled source (getProjectRootPath() -> .test-build)
 *   .test-build/test/...       compiled tests
 *
 * Nothing here is published: `files` in package.json lists only dist and res,
 * and .test-build/ is outside both.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stageRoot = path.join(projectRoot, '.test-build');
const tscBin = path.join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc');

/**
 * Compile the test configuration into .test-build/ and stage package metadata
 * and resources beside the compiled output.
 * @returns {string} absolute path of the staging root
 */
export function stageTests() {
  rmSync(stageRoot, { recursive: true, force: true });
  execFileSync(process.execPath, [tscBin, '-p', 'tsconfig.test.json'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  copyFileSync(path.join(projectRoot, 'package.json'), path.join(stageRoot, 'package.json'));
  cpSync(path.join(projectRoot, 'res'), path.join(stageRoot, 'res'), { recursive: true });
  return stageRoot;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const staged = stageTests();
  console.log(`Staged compiled tests at ${path.relative(projectRoot, staged)}/`);
}
