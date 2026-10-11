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
 * of test/ cannot block an unrelated run. Each stage is an independent directory.
 * Stage names are validated (see stageRootFor), so every stage, and every deletion
 * of one, stays directly under .test-build/.
 *
 * Nothing here is published: `files` in package.json lists only dist and res,
 * and .test-build/ is outside both.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ownedSpawnOptions } from './process-tree.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildRoot = path.join(projectRoot, '.test-build');
export const tscBin = path.join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc');

/** A stage name is one plain directory name: no separators, no leading dot, so no `..`. */
const STAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Absolute staging root for a stage name. Validated before anything is deleted: the
 * name must be one plain segment, and the resolved root must sit directly inside
 * .test-build/ (so `..`, separators, and absolute paths are rejected).
 * @param {string} stage
 * @returns {string}
 */
export function stageRootFor(stage) {
  if (!STAGE_NAME.test(stage)) {
    throw new Error(`Invalid stage name "${stage}": use letters, digits, '.', '_' or '-', starting with a letter or digit.`);
  }
  const stageRoot = path.join(buildRoot, stage);
  if (path.relative(buildRoot, stageRoot) !== stage) {
    throw new Error(`Stage "${stage}" resolves outside ${buildRoot}`);
  }
  return stageRoot;
}

/**
 * Removes a stage directory. Deletion goes through stageRootFor, so it can only
 * reach a direct child of .test-build/.
 * @param {string} stage
 */
export function removeStage(stage) {
  rmSync(stageRootFor(stage), { recursive: true, force: true });
}

/**
 * Compile the given test files into .test-build/<stage>/ and stage package
 * metadata and resources beside the compiled output.
 * @param {string[]} testFiles repo-relative paths of *.test.ts files under test/
 * @param {string} [stage='default'] staging directory name under .test-build/
 * @returns {string} absolute path of the staging root
 */
export function stageTests(testFiles, stage = 'default') {
  if (testFiles.length === 0) throw new Error('stageTests requires at least one test file');
  const stageRoot = stageRootFor(stage);
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

  // Owned like the runner's children (see process-tree.mjs): a terminal's Ctrl+C reaches only
  // the wrapper, which acts on it after this compile returns (a few seconds for the full suite).
  execFileSync(process.execPath, [tscBin, '-p', path.join(stageRoot, 'tsconfig.json')], {
    cwd: projectRoot,
    ...ownedSpawnOptions(),
    stdio: 'inherit',
  });
  copyFileSync(path.join(projectRoot, 'package.json'), path.join(stageRoot, 'package.json'));
  cpSync(path.join(projectRoot, 'res'), path.join(stageRoot, 'res'), { recursive: true });
  return stageRoot;
}
