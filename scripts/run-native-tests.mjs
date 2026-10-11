#!/usr/bin/env node
/**
 * Runs test files with the native Node test runner.
 *
 * Usage:
 *   node scripts/run-native-tests.mjs                          # every test/**\/*.test.ts
 *   node scripts/run-native-tests.mjs test/config.test.ts      # focused run of one file
 *   node scripts/run-native-tests.mjs --coverage               # coverage report -> coverage/lcov.info
 *   node scripts/run-native-tests.mjs --watch [test files...]  # restage and re-run on change
 *
 * Discovery is by file name: every *.test.ts under test/. Helpers, fixtures, and
 * support modules do not match and are never executed as tests.
 *
 * Each run stages into its own .test-build/run-<id>/ directory, removed when the run
 * ends, so concurrent runs (npm test beside test:watch) never share files. Set
 * NATIVE_TEST_STAGE=<name> to use a named stage instead; that stage is kept, and the
 * next run that names it replaces it.
 *
 * Experimental module mocks and experimental coverage are enabled only for this
 * test process. Coverage uses source maps, so results map back to src/*.ts.
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, watch as watchFiles } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { removeStage, stageRootFor, stageTests, tscBin } from './stage-tests.mjs';
import { signalTree, spawnOwned } from './process-tree.mjs';

/** Quiet period before a restage, so a burst of file-system events restages once. */
const RESTAGE_DELAY_MS = 150;

/**
 * Project-root files a stage reads: package.json is copied into it, and the stage's
 * tsconfig extends tsconfig.test.json, which extends tsconfig.json.
 */
const STAGE_INPUT_FILES = new Set(['package.json', 'tsconfig.json', 'tsconfig.test.json']);

/**
 * Signals that end a run: Ctrl+C, a kill, or closing the terminal. Each one is handled
 * so the generated stage is removed. Without a listener, Node exits at once and skips
 * that cleanup.
 */
const TERMINATION_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const coverage = args.includes('--coverage');
const watch = args.includes('--watch');
const requested = args
  .filter((arg) => !arg.startsWith('--'))
  .map((file) => path.posix.normalize(file.replaceAll('\\', '/')));

for (const file of requested) {
  if (!file.startsWith('test/') || !file.endsWith('.test.ts')) {
    console.error(`Not a test file under test/: ${file}`);
    process.exit(1);
  }
}

const namedStage = process.env.NATIVE_TEST_STAGE;
const stage = namedStage || `run-${randomUUID()}`;
// Validate the stage name before any child starts or any directory is removed.
stageRootFor(stage);

if (selectedTests().length === 0) {
  console.log('No test files found under test/.');
  process.exit(0);
}

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
  watchTests(nodeArgs);
} else {
  runOnce(nodeArgs).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

/**
 * One-shot run: stage the selected tests, run them, and remove the generated stage.
 *
 * A terminal signal is forwarded to the runner's process group, so its test processes
 * end with it, and cleanup still happens: the stage is removed only after the runner
 * has exited. The forwarder is installed before staging, so a signal during the
 * TypeScript compile is handled too (that compile runs to its end first; see stageTests).
 */
async function runOnce(baseNodeArgs) {
  const selected = selectedTests();
  let runner = null;
  const forward = (signal) => {
    if (runner) signalTree(runner, signal);
  };
  for (const signal of TERMINATION_SIGNALS) process.on(signal, forward);
  let code;
  try {
    const stageRoot = stageTests(selected, stage);
    runner = spawnOwned(process.execPath, [...baseNodeArgs, '--test', ...compiledFiles(stageRoot, selected)], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    code = await exitCodeOf(runner);
  } finally {
    for (const signal of TERMINATION_SIGNALS) process.off(signal, forward);
    discardGeneratedStage();
  }
  process.exit(code ?? 1);
}

/** @returns {Promise<number | null>} the child's exit code, or null when a signal ended it */
function exitCodeOf(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code));
  });
}

/**
 * Watch mode runs two children against one stage: the TypeScript watcher recompiles
 * into it, and the Node test runner re-executes the affected tests.
 *
 * The stage is a snapshot. res/, package.json, and the TypeScript configs are copied or
 * read once, and the test set is fixed when staged. So a change to any of those, or a
 * test file added or removed, stops both children, restages, and starts them again.
 * Edits to source and test contents need no restage: the children pick them up. While
 * no runner is live (a stage that failed, or one still being built), a change under
 * src/, test/, or res/ retries the stage. A child that exits for any reason other than
 * a restage or a shutdown ends the session with an error.
 */
function watchTests(baseNodeArgs) {
  let cycle = null; // { compiler, runner } while the children run
  let selected = [];
  let timer = null;
  let queue = Promise.resolve();
  let closing = false;

  /** True while no test runner is live: the stage failed or is still being built. */
  const stalled = () => cycle?.runner == null;

  const stopChild = (child) =>
    new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once('exit', resolve);
      signalTree(child, 'SIGTERM');
    });

  const stopCycle = async () => {
    const running = cycle;
    cycle = null;
    if (running) await Promise.all([running.compiler, running.runner].filter(Boolean).map(stopChild));
  };

  /**
   * A child that exits ends the session with an error unless this process asked for the
   * exit. A restage or a shutdown clears the cycle, or sets closing, before it stops a
   * child, so only an exit nobody requested gets here. The signal that ended the child
   * does not decide: a terminal's Ctrl+C reaches this process alone and it stops the
   * children itself, and a child killed from outside is an error even by SIGTERM.
   */
  const onUnexpectedExit = (started, name) => (code, signal) => {
    if (closing || cycle !== started) return;
    console.error(`${name} exited (code ${code}, signal ${signal}); watch mode stopped.`);
    shutdown(1);
  };

  /**
   * Starts the TypeScript watcher, then the test runner once the watcher reports its
   * first emit. tsc --watch emits every file again on start; a runner started before
   * that emit restarts its tests as soon as the files are rewritten.
   */
  const startChildren = (stageRoot, files) =>
    new Promise((resolve, reject) => {
      const compiler = spawnOwned(
        process.execPath,
        [tscBin, '-p', path.join(stageRoot, 'tsconfig.json'), '--watch', '--preserveWatchOutput'],
        { cwd: projectRoot, stdio: ['inherit', 'pipe', 'inherit'] }
      );
      const started = { compiler, runner: null };
      cycle = started;
      const compilerExited = onUnexpectedExit(started, 'tsc --watch');
      let seen = '';
      compiler.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);
        if (started.runner || cycle !== started) return;
        seen += chunk.toString();
        if (!seen.includes('Watching for file changes')) return;
        started.runner = spawnOwned(
          process.execPath,
          [...baseNodeArgs, '--test', '--watch', ...compiledFiles(stageRoot, files)],
          { cwd: projectRoot, stdio: 'inherit' }
        );
        started.runner.on('exit', onUnexpectedExit(started, 'node --test'));
        resolve(started);
      });
      compiler.once('exit', (code, signal) => {
        // Before the runner exists, the stage is failing: the caller reports it and waits for a change.
        if (started.runner) compilerExited(code, signal);
        else reject(new Error(`tsc --watch exited before its first emit (code ${code}, signal ${signal})`));
      });
    });

  const restage = async () => {
    if (closing) return;
    await stopCycle();
    if (closing) return; // shutdown began while the old children were stopping
    const next = selectedTests();
    selected = next;
    try {
      await startChildren(stageTests(next, stage), next);
    } catch (error) {
      if (!closing) console.error(`Staging failed; the next change to a watched file retries it.\n${error.message}`);
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      queue = queue.then(restage);
    }, RESTAGE_DELAY_MS);
  };

  const shutdown = async (code) => {
    if (closing) return;
    closing = true;
    clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
    await stopCycle();
    await queue; // a restage still running has stopped its children and returned
    discardGeneratedStage();
    process.exit(code);
  };

  const watchers = [
    watchFiles(path.join(projectRoot, 'res'), { recursive: true }, schedule),
    watchFiles(path.join(projectRoot, 'src'), { recursive: true }, () => {
      // The compiler watches source while it runs; only a stalled stage needs a retry.
      if (stalled()) schedule();
    }),
    watchFiles(path.join(projectRoot, 'test'), { recursive: true }, () => {
      // Content edits are the children's job; only a changed test set needs a restage.
      if (stalled() || selectedTests().join('\n') !== selected.join('\n')) schedule();
    }),
    watchFiles(projectRoot, (_event, name) => {
      if (STAGE_INPUT_FILES.has(name)) schedule();
    }),
  ];

  for (const signal of TERMINATION_SIGNALS) process.on(signal, () => shutdown(0));
  queue = queue.then(restage);
}

/** Removes the stage this run generated; a named stage (NATIVE_TEST_STAGE) is kept. */
function discardGeneratedStage() {
  if (!namedStage) removeStage(stage);
}

/** @returns {string[]} the requested test files, or every discovered test when none were named */
function selectedTests() {
  return requested.length > 0 ? requested : discoverTests();
}

/** @returns {string[]} repo-relative paths of every *.test.ts under test/, sorted */
function discoverTests() {
  return readdirSync(path.join(projectRoot, 'test'), { recursive: true })
    .map((entry) => entry.split(path.sep).join('/'))
    .filter((entry) => entry.endsWith('.test.ts'))
    .map((entry) => `test/${entry}`)
    .sort();
}

/** @returns {string[]} absolute paths of the compiled test files within a stage */
function compiledFiles(stageRoot, files) {
  return files.map((file) => path.join(stageRoot, file.replace(/\.ts$/, '.js')));
}

/** @returns {string} absolute path of coverage/lcov.info, creating its directory */
function ensureCoverageFile() {
  const dir = path.join(projectRoot, 'coverage');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, 'lcov.info');
}
