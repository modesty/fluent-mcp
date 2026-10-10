#!/usr/bin/env node
/**
 * Compiles the requested test files (and the source they import) into
 * .test-build/<stage>/ for the native Node test runner, and stages the package
 * metadata and resources that src/config.ts resolves from its own module location.
 *
 * Layout produced (mirrors the published package root):
 *   .test-build/<stage>/package.json   copy of the root package.json ("type": "module")
 *   .test-build/<stage>/res/           copy of the root res/ tree
 *   .test-build/<stage>/src/...        compiled source (getProjectRootPath() -> stage root)
 *   .test-build/<stage>/test/...       compiled tests
 *
 * Only the requested files are compiled, so an in-progress file in another part
 * of test/ cannot block an unrelated run. Each stage is an independent directory,
 * so concurrent runs with different stage names do not interfere.
 *
 * Nothing here is published: `files` in package.json lists only dist and res,
 * and .test-build/ is outside both.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildRoot = path.join(projectRoot, '.test-build');
export const tscBin = path.join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc');

/**
 * Compile the given test files into .test-build/<stage>/ and stage package
 * metadata and resources beside the compiled output.
 * @param {string[]} testFiles repo-relative paths of *.test.ts files under test/
 * @param {string} [stage='default'] staging directory name under .test-build/
 * @returns {string} absolute path of the staging root
 */
export function stageTests(testFiles, stage = 'default') {
  if (testFiles.length === 0) throw new Error('stageTests requires at least one test file');
  const stageRoot = path.join(buildRoot, stage);
  rmSync(stageRoot, { recursive: true, force: true });
  mkdirSync(stageRoot, { recursive: true });

  // The stage tsconfig sits at the stage root, so rootDir/outDir are relative to it:
  // rootDir is the project root (keeps src/ and test/ side by side) and outDir is
  // the stage root itself.
  const stageConfig = {
    extends: path.relative(stageRoot, path.join(projectRoot, 'tsconfig.test.json')),
    compilerOptions: {
      rootDir: path.relative(stageRoot, projectRoot),
      outDir: '.',
    },
    include: [],
    files: testFiles.map((file) => path.relative(stageRoot, path.join(projectRoot, file))),
  };
  writeFileSync(path.join(stageRoot, 'tsconfig.json'), JSON.stringify(stageConfig, null, 2) + '\n');

  execFileSync(process.execPath, [tscBin, '-p', path.join(stageRoot, 'tsconfig.json')], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  copyFileSync(path.join(projectRoot, 'package.json'), path.join(stageRoot, 'package.json'));
  cpSync(path.join(projectRoot, 'res'), path.join(stageRoot, 'res'), { recursive: true });
  return stageRoot;
}
