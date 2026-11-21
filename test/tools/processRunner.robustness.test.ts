/**
 * Robustness acceptance tests for NodeProcessRunner (plan P0.2 / P0.3 / P0.4):
 *  - P0.2: a timeout terminates the child and RESOLVES with the buffered partial
 *          output + a non-zero exit code (rather than rejecting and discarding),
 *          and an operator/config timeout override supersedes the per-call value.
 *  - P0.3: an external abort signal (MCP client cancellation) kills the child.
 *  - P0.4: stdout/stderr are bounded (head + tail + elision marker); a call may
 *          raise its stdout cap, and a cut stdout is flagged.
 *
 * These spawn real short-lived Node child processes (config and logger are
 * replaced with the shared fixtures, providing servicenowSdk.commandTimeoutMs).
 *
 * node:test has no default per-test timeout. A child that is never killed would
 * hang the run, so each test carries an explicit timeout to keep that failure
 * mode a failure.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ChildProcess, type SpawnOptions } from 'node:child_process';
import { channel } from 'node:diagnostics_channel';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { configFixture, loggerFixture, withEnvironment } from '../support/fixtures.js';

mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const {
  NodeProcessRunner,
  resolveWindowsTaskkillPath,
  killWindowsProcessTree,
  killProcessTree,
} = await import('../../src/tools/processors/processRunner.js');
const { CLIExecutor } = await import('../../src/tools/processors/cliExecutor.js');

/** Explicit per-test timeout (with slack for a loaded machine). */
const TEST_TIMEOUT_MS = 10_000;

/** A child that writes `text` to stdout immediately, then hangs indefinitely. */
function hangingChildArgs(text: string): string[] {
  return ['-e', `process.stdout.write(${JSON.stringify(text)}); setInterval(() => {}, 1000);`];
}

/**
 * Like {@link hangingChildArgs}, but the child writes `text` synchronously to
 * fd 1 and only then creates `markerPath`. Once the marker exists the text is
 * already in the pipe, so a test can act on "output emitted" instead of guessing
 * with a wall-clock delay (a fixed 150 ms abort raced child startup under load).
 */
function hangingChildWithMarkerArgs(text: string, markerPath: string): string[] {
  return ['-e', [
    "const fs = require('node:fs');",
    `fs.writeSync(1, ${JSON.stringify(text)});`,
    `fs.writeFileSync(${JSON.stringify(markerPath)}, '');`,
    'setInterval(() => {}, 1000);',
  ].join(' ')];
}

/**
 * Resolve once the child has created `markerPath`.
 *
 * Fails instead of polling forever: rejects when `run` settles first (the child
 * exited before signalling readiness) and when `signal` aborts. Pass the test
 * context's signal: node:test aborts it on timeout, but a timeout alone does not
 * stop a pending loop, which would keep the test process alive. A test that
 * mocks `setTimeout` passes a `sleep` captured from the real timers first.
 */
async function waitForMarker(
  markerPath: string,
  run: Promise<unknown>,
  signal: AbortSignal,
  sleep: (ms: number) => Promise<unknown> = (ms) => delay(ms, undefined, { signal }),
): Promise<void> {
  let settled = false;
  const markSettled = () => { settled = true; };
  run.then(markSettled, markSettled);
  while (!fs.existsSync(markerPath)) {
    if (settled) throw new Error(`child finished before creating its readiness marker ${markerPath}`);
    if (signal.aborted) throw signal.reason;
    await sleep(10);
  }
}

/** A sleep on the real `setTimeout`, bound now so it still works after the test mocks timers. */
function realSleep(): (ms: number) => Promise<void> {
  const realSetTimeout = globalThis.setTimeout.bind(globalThis);
  return (ms) => new Promise((resolve) => { realSetTimeout(resolve, ms); });
}

/**
 * Portable loopback TCP socket probe that observes child/grandchild liveness
 * through kernel FD closure rather than `process.kill(pid, 0)`. Works identically
 * on macOS, Linux (even in containers where PID 1 does not reap zombies), and
 * Windows (without requiring Windows named-pipe paths).
 */
async function createSocketProbe(signal: AbortSignal): Promise<{
  port: number;
  waitConnected: () => Promise<void>;
  waitClosed: () => Promise<void>;
  close: () => void;
}> {
  let peer: net.Socket | undefined;
  let resolveConnected!: () => void;
  let resolveClosed!: () => void;
  let closed = false;
  const connectedPromise = new Promise<void>((resolve) => { resolveConnected = resolve; });
  const closedPromise = new Promise<void>((resolve) => { resolveClosed = resolve; });

  const server = net.createServer((socket) => {
    peer = socket;
    resolveConnected();
    socket.on('close', () => {
      closed = true;
      resolveClosed();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = (server.address() as net.AddressInfo).port;

  const abortRace = <T>(promise: Promise<T>, label: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      if (signal.aborted) { reject(new Error(`${label}: test aborted`)); return; }
      const onAbort = () => reject(new Error(`${label}: test aborted`));
      signal.addEventListener('abort', onAbort, { once: true });
      promise.then(
        (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
        (error) => { signal.removeEventListener('abort', onAbort); reject(error); }
      );
    });

  return {
    port,
    waitConnected: () => abortRace(connectedPromise, 'waiting for child socket connection'),
    waitClosed: () => closed ? Promise.resolve() : abortRace(closedPromise, 'waiting for child socket close'),
    close: () => {
      peer?.destroy();
      server.close();
    },
  };
}

describe('NodeProcessRunner — timeout returns partial output (P0.2)', () => {
  it('resolves (does not reject) with buffered stdout and a non-zero exit on timeout', { timeout: TEST_TIMEOUT_MS }, async (t) => {
    // The 250 ms budget must not include child startup: the timeout is a mocked
    // timer, fired only once the child has provably written its output (a real
    // child and readiness marker, as in the cancellation test below).
    const sleep = realSleep();
    t.mock.timers.enable({ apis: ['setTimeout'] });

    const runner = new NodeProcessRunner();
    const controller = new AbortController();
    const markerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-mcp-timeout-'));
    const markerPath = path.join(markerDir, 'emitted');
    const run = runner.run(
      process.execPath,
      hangingChildWithMarkerArgs('partial-before-timeout', markerPath),
      undefined,
      250, // per-call timeout, on the mocked clock
      controller.signal
    );
    let settled = false;
    run.then(() => { settled = true; }, () => { settled = true; });

    let result;
    try {
      await waitForMarker(markerPath, run, t.signal, sleep);
      // Longer than the budget on the real clock: only the mocked timer can end the run.
      await sleep(300);
      assert.equal(settled, false, 'the run settled before its (mocked) timeout fired');
      t.mock.timers.tick(250);
      result = await run;
    } finally {
      // On any failure path (early exit, test timeout) stop the child and wait
      // for it, so no process or pending work outlives the test.
      controller.abort();
      await run.catch(() => undefined);
      fs.rmSync(markerDir, { recursive: true, force: true });
    }

    // Partial stdout is preserved, not discarded.
    assert.ok(result.stdout.includes('partial-before-timeout'));
    // Distinct non-zero exit code (124 = timeout convention), not cancellation (130).
    assert.equal(result.exitCode, 124);
    // A human-readable note is appended to stderr.
    assert.match(result.stderr, /timed out after 250ms/i);
  });

  it('honors an operator/config timeout override over the per-call timeout', { timeout: TEST_TIMEOUT_MS }, async () => {
    // overrideTimeoutMs simulates FLUENT_MCP_COMMAND_TIMEOUT_MS being set: it must
    // win even when the caller passes a much larger per-call timeout.
    const runner = new NodeProcessRunner({ overrideTimeoutMs: 200 });
    const start = Date.now();
    const result = await runner.run(
      process.execPath,
      hangingChildArgs('x'),
      undefined,
      600_000 // caller asked for 10 minutes; the override must clamp to 200ms
    );

    assert.equal(result.exitCode, 124);
    assert.ok(Date.now() - start < 5_000); // proves the override, not the 10-min value, applied
  });

  // Node fires a timer longer than 2^31 - 1 ms after 1 ms. Exec's budget is its
  // timeoutMs (up to 2^31 - 1) plus 60 s, and download/transform multiply
  // timeoutSeconds by 1000, so such a call used to be killed at once (exit 124).
  for (const [label, options, perCall] of [
    ['a per-call budget', {}, 2_147_483_647 + 60_000],
    ['an operator override', { overrideTimeoutMs: 2_147_483_648 }, undefined],
    ['a configured default', { defaultTimeoutMs: 2 ** 40 }, undefined],
  ] as const) {
    it(`lets a command finish under ${label} longer than a Node timer can wait`, { timeout: TEST_TIMEOUT_MS }, async (t) => {
      const warnings: string[] = [];
      const onWarning = (warning: Error) => { warnings.push(warning.name); };
      process.on('warning', onWarning);
      t.after(() => { process.off('warning', onWarning); });
      const runner = new NodeProcessRunner(options);

      const result = await runner.run(
        process.execPath,
        ['-e', "setTimeout(() => process.stdout.write('done'), 300)"],
        undefined,
        perCall
      );

      assert.deepEqual({ exitCode: result.exitCode, stdout: result.stdout }, { exitCode: 0, stdout: 'done' });
      assert.ok(!warnings.includes('TimeoutOverflowWarning'));
    });
  }
});

describe('NodeProcessRunner — client cancellation kills the child (P0.3)', () => {
  it('aborting the signal terminates the process and returns partial output', { timeout: TEST_TIMEOUT_MS }, async (t) => {
    const runner = new NodeProcessRunner();
    const controller = new AbortController();

    // Abort once the child has provably emitted its first output. If the child
    // were NOT killed it hangs forever and this test would time out.
    const markerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-mcp-cancel-'));
    const markerPath = path.join(markerDir, 'emitted');
    const run = runner.run(
      process.execPath,
      hangingChildWithMarkerArgs('emitted-then-cancelled', markerPath),
      undefined,
      600_000, // long timeout so the *signal*, not the timeout, ends the process
      controller.signal
    );
    let result;
    try {
      await waitForMarker(markerPath, run, t.signal);
      controller.abort();
      result = await run;
    } finally {
      // On any failure path (early exit, test timeout) stop the child and wait
      // for it, so no process or pending work outlives the test.
      controller.abort();
      await run.catch(() => undefined);
      fs.rmSync(markerDir, { recursive: true, force: true });
    }

    assert.ok(result.stdout.includes('emitted-then-cancelled'));
    assert.equal(result.exitCode, 130); // cancellation convention
    assert.match(result.stderr, /cancelled/i);
  });

  it('returns cancellation before even attempting to spawn when the signal is already aborted', { timeout: TEST_TIMEOUT_MS }, async () => {
    const runner = new NodeProcessRunner();
    const result = await runner.run(
      '', // spawn would throw synchronously for an empty executable
      [],
      undefined,
      600_000,
      AbortSignal.abort()
    );

    assert.equal(result.exitCode, 130);
    assert.match(result.stderr, /cancelled/i);
  });

  it('never signals a failed spawn while its asynchronous ENOENT is pending', async (t) => {
    // Keep a regression from delivering a real signal through a PID-less handle.
    const kill = t.mock.method(ChildProcess.prototype, 'kill', () => false);
    const controller = new AbortController();
    const missing = path.join(os.tmpdir(), 'fluent-mcp-no-such-executable', 'node');
    const run = new NodeProcessRunner().run(missing, [], undefined, undefined, controller.signal);
    controller.abort();
    const result = await run;

    assert.equal(kill.mock.callCount(), 0);
    assert.equal(result.exitCode, 130);
    assert.match(result.stderr, /No child process was started/);
    assert.doesNotMatch(result.stderr, /SIGKILL/);
  });

  it('kills grandchildren spawned by the child when cancelled (zombie-safe FD check)', {
    timeout: TEST_TIMEOUT_MS,
    skip: process.platform === 'win32' && 'POSIX process groups',
  }, async (t) => {
    const runner = new NodeProcessRunner();
    const controller = new AbortController();
    const probe = await createSocketProbe(t.signal);
    // Socket-close exit handler prevents leaking the grandchild if a regression
    // makes the assertion fail and `finally` closes the probe server.
    const grandchildScript = [
      "const net = require('node:net');",
      `const s = net.createConnection({ host: '127.0.0.1', port: ${probe.port} });`,
      's.once("close", () => process.exit(0));',
      'setTimeout(() => process.exit(0), 30000);',
    ].join(' ');
    const parentScript = [
      "const { spawn } = require('node:child_process');",
      `spawn(process.execPath, ['-e', ${JSON.stringify(grandchildScript)}], { stdio: 'ignore' });`,
      'setInterval(() => {}, 1000);',
    ].join(' ');

    const run = runner.run(process.execPath, ['-e', parentScript], undefined, 600_000, controller.signal);
    try {
      await probe.waitConnected();
      controller.abort();
      const result = await run;
      assert.equal(result.exitCode, 130);
      await probe.waitClosed();
    } finally {
      controller.abort();
      await run.catch(() => undefined);
      probe.close();
    }
  });

  it('ends remaining POSIX group members when the leader exits normally', {
    timeout: TEST_TIMEOUT_MS,
    skip: process.platform === 'win32' && 'POSIX process groups',
  }, async (t) => {
    const runner = new NodeProcessRunner();
    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-orphan-'));
    const readyPath = path.join(probeDir, 'ready');
    const probe = await createSocketProbe(t.signal);
    // Socket-close exit handler ensures no worker leaks if an assertion catches a regression.
    const workerScript = [
      "const fs = require('node:fs');",
      "const net = require('node:net');",
      `const s = net.createConnection({ host: '127.0.0.1', port: ${probe.port} }, () => fs.writeFileSync(${JSON.stringify(readyPath)}, ''));`,
      's.once("close", () => process.exit(0));',
      'setTimeout(() => process.exit(0), 30000);',
    ].join(' ');
    const leaderScript = [
      "const fs = require('node:fs');",
      "const { spawn } = require('node:child_process');",
      `spawn(process.execPath, ['-e', ${JSON.stringify(workerScript)}], { stdio: 'ignore' });`,
      `const timer = setInterval(() => { if (fs.existsSync(${JSON.stringify(readyPath)})) { clearInterval(timer); process.stdout.write('leader-ok'); process.exit(0); } }, 10);`,
    ].join(' ');

    try {
      const result = await runner.run(process.execPath, ['-e', leaderScript], undefined, TEST_TIMEOUT_MS);
      assert.deepEqual({ exitCode: result.exitCode, stdout: result.stdout }, { exitCode: 0, stdout: 'leader-ok' });
      // Leader exited cleanly with an independent-stdio worker still in its process group;
      // NodeProcessRunner must sweep the group before forgetting the leader.
      await probe.waitClosed();
    } finally {
      probe.close();
      fs.rmSync(probeDir, { recursive: true, force: true });
    }
  });

  it('ends remaining POSIX group members that inherit stdio on leader exit without timing out', {
    timeout: TEST_TIMEOUT_MS,
    skip: process.platform === 'win32' && 'POSIX process groups',
  }, async (t) => {
    const runner = new NodeProcessRunner();
    // Keep the deadline frozen through both Node startups, the handshake and exit.
    // The test signal cancels the runner if its exit sweep fails to close the pipes.
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-stdio-'));
    const readyPath = path.join(probeDir, 'ready');
    const probe = await createSocketProbe(t.signal);
    const workerScript = [
      "const fs = require('node:fs');",
      "const net = require('node:net');",
      `const s = net.createConnection({ host: '127.0.0.1', port: ${probe.port} }, () => fs.writeFileSync(${JSON.stringify(readyPath)}, ''));`,
      's.once("close", () => process.exit(0));',
      'setTimeout(() => process.exit(0), 30000);',
    ].join(' ');
    // Worker inherits stdout and stderr (default stdio): if the runner waited for
    // `close` before sweeping the process group, this successful CLI would hang
    // until the deadline. Only the exit sweep can complete this run with exit 0.
    const leaderScript = [
      "const fs = require('node:fs');",
      "const { spawn } = require('node:child_process');",
      `spawn(process.execPath, ['-e', ${JSON.stringify(workerScript)}], { stdio: 'inherit' });`,
      `const timer = setInterval(() => { if (fs.existsSync(${JSON.stringify(readyPath)})) { clearInterval(timer); process.stdout.write('leader-ok'); process.exit(0); } }, 10);`,
    ].join(' ');

    try {
      const run = runner.run(process.execPath, ['-e', leaderScript], undefined, 800, t.signal);
      await probe.waitConnected();
      const result = await run;
      assert.deepEqual({ exitCode: result.exitCode, stdout: result.stdout }, { exitCode: 0, stdout: 'leader-ok' });
      await probe.waitClosed();
    } finally {
      probe.close();
      fs.rmSync(probeDir, { recursive: true, force: true });
    }
  });

  it('bounds the wait for close and reports a cleanup diagnostic when tree termination falls back to leader-only kill', {
    timeout: TEST_TIMEOUT_MS,
  }, async (t) => {
    // Mock setTimeout so child/descendant startup never races the 300 ms deadline.
    const sleep = realSleep();
    t.mock.timers.enable({ apis: ['setTimeout'] });

    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-grace-'));
    const readyPath = path.join(probeDir, 'ready');
    const emittedPath = path.join(probeDir, 'emitted');
    const probe = await createSocketProbe(t.signal);
    // Descendant inherits stdout/stderr so killing only the leader leaves the
    // pipes open; it exits immediately once our probe socket closes in `finally`.
    const descendantScript = [
      "const fs = require('node:fs');",
      "const net = require('node:net');",
      `const s = net.createConnection({ host: '127.0.0.1', port: ${probe.port} }, () => fs.writeFileSync(${JSON.stringify(readyPath)}, ''));`,
      's.once("close", () => process.exit(0));',
      'setTimeout(() => process.exit(0), 30000);',
    ].join(' ');
    const leaderScript = [
      "const fs = require('node:fs');",
      "const { spawn } = require('node:child_process');",
      `spawn(process.execPath, ['-e', ${JSON.stringify(descendantScript)}], { stdio: 'inherit' });`,
      `const timer = setInterval(() => { if (fs.existsSync(${JSON.stringify(readyPath)})) { clearInterval(timer); fs.writeSync(1, 'partial-before-fallback'); fs.writeFileSync(${JSON.stringify(emittedPath)}, ''); } }, 10);`,
      'setInterval(() => {}, 1000);',
    ].join(' ');

    // Simulate failed Windows taskkill with successful leader-only fallback.
    const runner = new NodeProcessRunner({
      failedTreeKillCloseGraceMs: 150,
      terminateTree: (child, sig) => {
        return child.kill(sig) ? 'leader_only' : 'failed';
      },
    });

    const controller = new AbortController();
    const run = runner.run(process.execPath, ['-e', leaderScript], undefined, 300, controller.signal);
    let result;
    try {
      await probe.waitConnected();
      await waitForMarker(emittedPath, run, t.signal, sleep);
      // Fire the command deadline on the mocked clock, then the 150 ms grace timer.
      t.mock.timers.tick(300);
      await sleep(20);
      t.mock.timers.tick(150);
      result = await run;
    } finally {
      controller.abort();
      probe.close();
      t.mock.timers.tick(500);
      await run.catch(() => undefined);
      fs.rmSync(probeDir, { recursive: true, force: true });
    }

    assert.equal(result.exitCode, 124);
    assert.ok(result.stdout.includes('partial-before-fallback'), result.stdout);
    assert.match(result.stderr, /Only the leader was signaled/);
    assert.match(result.stderr, /child stdio did not close within 150ms/i);
  });

  it('preserves the failed tree-termination diagnostic even when close arrives before the grace timer expires', {
    timeout: TEST_TIMEOUT_MS,
  }, async (t) => {
    const sleep = realSleep();
    t.mock.timers.enable({ apis: ['setTimeout'] });

    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-close-diag-'));
    const readyPath = path.join(probeDir, 'ready');
    const emittedPath = path.join(probeDir, 'emitted');
    const probe = await createSocketProbe(t.signal);
    // Worker uses independent stdio so killing only the leader lets `close` fire
    // immediately (well before the 500 ms grace timer), while the worker stays alive.
    const workerScript = [
      "const fs = require('node:fs');",
      "const net = require('node:net');",
      `const s = net.createConnection({ host: '127.0.0.1', port: ${probe.port} }, () => fs.writeFileSync(${JSON.stringify(readyPath)}, ''));`,
      's.once("close", () => process.exit(0));',
      'setTimeout(() => process.exit(0), 30000);',
    ].join(' ');
    const leaderScript = [
      "const fs = require('node:fs');",
      "const { spawn } = require('node:child_process');",
      `spawn(process.execPath, ['-e', ${JSON.stringify(workerScript)}], { stdio: 'ignore' });`,
      `const timer = setInterval(() => { if (fs.existsSync(${JSON.stringify(readyPath)})) { clearInterval(timer); fs.writeSync(1, 'partial-independent'); fs.writeFileSync(${JSON.stringify(emittedPath)}, ''); } }, 10);`,
      'setInterval(() => {}, 1000);',
    ].join(' ');

    const runner = new NodeProcessRunner({
      failedTreeKillCloseGraceMs: 500,
      terminateTree: (child, sig) => {
        return child.kill(sig) ? 'leader_only' : 'failed';
      },
    });

    const controller = new AbortController();
    const run = runner.run(process.execPath, ['-e', leaderScript], undefined, 300, controller.signal);
    let result;
    try {
      await probe.waitConnected();
      await waitForMarker(emittedPath, run, t.signal, sleep);
      t.mock.timers.tick(300);
      // Do NOT advance the grace timer: `close` fires on its own because the worker has ignore stdio.
      result = await run;
    } finally {
      controller.abort();
      probe.close();
      t.mock.timers.tick(500);
      await run.catch(() => undefined);
      fs.rmSync(probeDir, { recursive: true, force: true });
    }

    assert.equal(result.exitCode, 124);
    assert.ok(result.stdout.includes('partial-independent'), result.stdout);
    assert.match(result.stderr, /Only the leader was signaled; a descendant may still be running/);
  });

  for (const closeBeforeGrace of [false, true] as const) {
    it(
      `records skipped Windows tree kill without claiming SIGKILL when leader exited while descendant holds stdio (${closeBeforeGrace ? 'early close' : 'grace expiry'})`,
      { timeout: TEST_TIMEOUT_MS },
      async (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });

        const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-win-skip-'));
        const readyPath = path.join(probeDir, 'ready');
        const probe = await createSocketProbe(t.signal);
        const descendantScript = [
          "const fs = require('node:fs');",
          "const net = require('node:net');",
          `const s = net.createConnection({ host: '127.0.0.1', port: ${probe.port} }, () => fs.writeFileSync(${JSON.stringify(readyPath)}, ''));`,
          's.once("close", () => process.exit(0));',
          'setTimeout(() => process.exit(0), 30000);',
        ].join(' ');
        // The descendant inherits stdout, keeping close pending after the leader exits.
        const leaderScript = [
          "const fs = require('node:fs');",
          "const { spawn } = require('node:child_process');",
          `spawn(process.execPath, ['-e', ${JSON.stringify(descendantScript)}], { stdio: 'inherit' });`,
          `const timer = setInterval(() => { if (fs.existsSync(${JSON.stringify(readyPath)})) { clearInterval(timer); fs.writeSync(1, 'leader-done'); process.exit(0); } }, 10);`,
        ].join(' ');

        let taskkillCalled = false;
        const runner = new NodeProcessRunner({
          failedTreeKillCloseGraceMs: 150,
          terminateTree: (child, sig) =>
            killProcessTree(child, sig, {
              platform: 'win32',
              runTaskkill: () => {
                taskkillCalled = true;
                return { status: 0 };
              },
            }),
        });

        const controller = new AbortController();
        // Node publishes the ChildProcess synchronously on construction. Subscribe
        // only around this spawn so the test observes the runner's actual exit event.
        const childChannel = channel('child_process');
        let leader: ChildProcess | undefined;
        const onChild = (message: unknown) => { leader = (message as { process: ChildProcess }).process; };
        childChannel.subscribe(onChild);
        const run = runner.run(process.execPath, ['-e', leaderScript], undefined, 450, controller.signal);
        childChannel.unsubscribe(onChild);
        let result;
        try {
          assert.ok(leader);
          const exited = once(leader, 'exit', { signal: t.signal });
          await Promise.all([probe.waitConnected(), exited]);
          t.mock.timers.tick(450);
          if (closeBeforeGrace) {
            // Descendant exits on its own before the 150 ms grace window expires.
            probe.close();
          } else {
            t.mock.timers.tick(150);
          }
          result = await run;
        } finally {
          controller.abort();
          probe.close();
          t.mock.timers.tick(500);
          await run.catch(() => undefined);
          fs.rmSync(probeDir, { recursive: true, force: true });
        }

        assert.equal(taskkillCalled, false, 'Windows killProcessTree must not invoke taskkill on an exited leader PID');
        assert.equal(result.exitCode, 124);
        assert.ok(result.stdout.includes('leader-done'), result.stdout);
        assert.doesNotMatch(result.stderr, /SIGKILL/, result.stderr);
        assert.match(result.stderr, /while waiting for child stdio to close/, result.stderr);
        assert.match(result.stderr, /Process-tree termination was skipped because the leader process had already exited/, result.stderr);
        assert.match(result.stderr, /descendant may still be running/, result.stderr);
      }
    );
  }

  it('never lets a later timeout overwrite an earlier cancellation while a descendant holds stdout open', {
    timeout: TEST_TIMEOUT_MS,
  }, async (t) => {
    const sleep = realSleep();
    t.mock.timers.enable({ apis: ['setTimeout'] });

    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-cancel-race-'));
    const readyPath = path.join(probeDir, 'ready');
    const emittedPath = path.join(probeDir, 'emitted');
    const probe = await createSocketProbe(t.signal);
    const descendantScript = [
      "const fs = require('node:fs');",
      "const net = require('node:net');",
      `const s = net.createConnection({ host: '127.0.0.1', port: ${probe.port} }, () => fs.writeFileSync(${JSON.stringify(readyPath)}, ''));`,
      's.once("close", () => process.exit(0));',
      'setTimeout(() => process.exit(0), 30000);',
    ].join(' ');
    const leaderScript = [
      "const fs = require('node:fs');",
      "const { spawn } = require('node:child_process');",
      `spawn(process.execPath, ['-e', ${JSON.stringify(descendantScript)}], { stdio: 'inherit' });`,
      `const timer = setInterval(() => { if (fs.existsSync(${JSON.stringify(readyPath)})) { clearInterval(timer); fs.writeSync(1, 'before-cancel'); fs.writeFileSync(${JSON.stringify(emittedPath)}, ''); } }, 10);`,
      'setInterval(() => {}, 1000);',
    ].join(' ');

    const runner = new NodeProcessRunner({
      failedTreeKillCloseGraceMs: 150,
      terminateTree: (child, sig) => {
        return child.kill(sig) ? 'leader_only' : 'failed';
      },
    });
    const controller = new AbortController();
    const run = runner.run(process.execPath, ['-e', leaderScript], undefined, 200, controller.signal);
    let result;
    try {
      await probe.waitConnected();
      await waitForMarker(emittedPath, run, t.signal, sleep);
      // Cancel at 140 ms on a 200 ms budget, then advance past both the 200 ms
      // original command deadline and the 150 ms grace timer.
      t.mock.timers.tick(140);
      controller.abort();
      t.mock.timers.tick(100); // t = 240 ms (past the 200 ms deadline)
      t.mock.timers.tick(60);  // t = 300 ms (past the 150 ms grace window)
      result = await run;
    } finally {
      probe.close();
      t.mock.timers.tick(500);
      await run.catch(() => undefined);
      fs.rmSync(probeDir, { recursive: true, force: true });
    }

    assert.equal(result.exitCode, 130);
    assert.match(result.stderr, /cancelled by the client/i);
    assert.doesNotMatch(result.stderr, /timed out/i);
  });

  for (const graceful of [false, true]) {
    it(`sweeps detached children and preserves ${graceful ? 'one-shot graceful shutdown' : 'default signal termination'}`, {
      timeout: TEST_TIMEOUT_MS,
      skip: process.platform === 'win32' && 'POSIX process groups',
    }, async (t) => {
      const processTreeUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'process-tree.mjs')).href;
      const { spawnOwned, signalTree } = await import(processTreeUrl) as {
        spawnOwned: (command: string, args: string[], options: SpawnOptions) => ChildProcess;
        signalTree: (child: ChildProcess, signal: NodeJS.Signals) => void;
      };
      const runnerModuleUrl = new URL('../../src/tools/processors/processRunner.js', import.meta.url).href;

      const probe = await createSocketProbe(t.signal);
      // Independent shutdown paths so interrupting the outer test runner mid-test
      // (before `finally` runs) never orphans either fixture process:
      //  - owner watches its stdin pipe and self-terminates with SIGTERM on EOF
      //    (triggering NodeProcessRunner's signal sweep);
      //  - child also exits if the test's probe socket server disconnects.
      // Neither path fires while the test worker stays alive during the assertion.
      const childScript = [
        "const net = require('node:net');",
        `const s = net.createConnection({ host: '127.0.0.1', port: ${probe.port} });`,
        's.once("close", () => process.exit(0));',
        'setTimeout(() => process.exit(0), 30000);',
      ].join(' ');
      const ownerScript = [
        graceful ? "process.once('SIGTERM', () => process.stdin.once('data', () => process.exit(42)));" : '',
        "process.stdin.resume(); process.stdin.once('end', () => process.kill(process.pid, 'SIGTERM'));",
        'setTimeout(() => process.exit(0), 30000).unref();',
        `const { NodeProcessRunner } = await import(${JSON.stringify(runnerModuleUrl)});`,
        `await new NodeProcessRunner().run(process.execPath, ['-e', ${JSON.stringify(childScript)}], undefined, 600_000);`,
      ].join(' ');

      const owner = spawnOwned(process.execPath, ['--input-type=module', '-e', ownerScript], {
        cwd: process.cwd(),
        stdio: ['pipe', 'ignore', 'ignore'],
        env: { ...process.env, FLUENT_MCP_LOG_LEVEL: 'error' },
      });
      const ownerExit = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
        owner.once('exit', (code, signal) => resolve({ code, signal }));
      });

      try {
        await probe.waitConnected();
        signalTree(owner, 'SIGTERM');
        await probe.waitClosed();
        if (graceful) owner.stdin?.write('finish shutdown');
        assert.deepEqual(await ownerExit, graceful ? { code: 42, signal: null } : { code: null, signal: 'SIGTERM' });
      } finally {
        owner.stdin?.end();
        signalTree(owner, 'SIGKILL');
        probe.close();
      }
    });
  }

  it('detaches signal handlers once no children are active', {
    timeout: TEST_TIMEOUT_MS,
    skip: process.platform === 'win32' && 'POSIX signals',
  }, async () => {
    const before = {
      SIGINT: process.listenerCount('SIGINT'),
      SIGTERM: process.listenerCount('SIGTERM'),
      SIGHUP: process.listenerCount('SIGHUP'),
    };
    const runner = new NodeProcessRunner();
    const result = await runner.run(process.execPath, ['-e', "process.stdout.write('ok')"]);
    assert.equal(result.exitCode, 0);
    assert.deepEqual({
      SIGINT: process.listenerCount('SIGINT'),
      SIGTERM: process.listenerCount('SIGTERM'),
      SIGHUP: process.listenerCount('SIGHUP'),
    }, before);
  });
});

describe('Windows taskkill resolution and fallback', () => {
  it('resolves taskkill.exe from SystemRoot/System32, falling back to windir or C:\\Windows', () => {
    assert.equal(resolveWindowsTaskkillPath({ SystemRoot: 'D:\\WinNT' }), 'D:\\WinNT\\System32\\taskkill.exe');
    assert.equal(resolveWindowsTaskkillPath({ windir: 'E:\\Windows' }), 'E:\\Windows\\System32\\taskkill.exe');
    assert.equal(resolveWindowsTaskkillPath({}), 'C:\\Windows\\System32\\taskkill.exe');
    // A relative SystemRoot must never resolve into cwd.
    assert.equal(resolveWindowsTaskkillPath({ SystemRoot: '.\\evil' }), 'C:\\Windows\\System32\\taskkill.exe');
  });

  it('invokes absolute taskkill.exe with a timeout and falls back to child.kill on error or non-zero exit', () => {
    const calls: Array<{ command: string; args: string[]; options: { stdio: 'ignore'; windowsHide: true; timeout: number } }> = [];
    let fallbackCount = 0;

    const succeeded = killWindowsProcessTree(
      4242,
      () => { fallbackCount += 1; return true; },
      (command, args, options) => {
        calls.push({ command, args, options });
        return { status: 0 };
      },
      { SystemRoot: 'C:\\Windows' }
    );
    assert.equal(succeeded, 'terminated');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, 'C:\\Windows\\System32\\taskkill.exe');
    assert.deepEqual(calls[0].args, ['/pid', '4242', '/T', '/F']);
    assert.equal(calls[0].options.windowsHide, true);
    assert.ok(calls[0].options.timeout > 0);
    assert.equal(fallbackCount, 0);

    for (const outcome of [
      { status: 1 },
      { status: null },
      { error: new Error('ETIMEDOUT'), status: null },
    ]) {
      let called = false;
      const ok = killWindowsProcessTree(4242, () => { called = true; return true; }, () => outcome, { SystemRoot: 'C:\\Windows' });
      assert.equal(ok, 'leader_only', JSON.stringify(outcome));
      assert.equal(called, true, JSON.stringify(outcome));
    }

    // A refused signal or exception cannot be reported as a successful leader kill.
    for (const fallback of [() => false, () => { throw new Error('ESRCH'); }]) {
      assert.equal(killWindowsProcessTree(4242, fallback, () => ({ status: 128 })), 'failed');
    }
  });

  for (const platform of ['darwin', 'win32'] as const) {
    it(`reports an unsuccessful ${platform} kill in the runner result`, { timeout: TEST_TIMEOUT_MS }, async (t) => {
      const controller = new AbortController();
      const runner = new NodeProcessRunner({
        terminateTree: (child, sig) => killProcessTree(child, sig, { platform, runTaskkill: () => ({ status: 1 }) }),
      });
      // Keep the real child short-lived, but simulate the OS kill outcomes.
      t.mock.method(process, 'kill', () => { throw Object.assign(new Error(), { code: 'ESRCH' }); });
      t.mock.method(ChildProcess.prototype, 'kill', () => false);
      const run = runner.run(process.execPath, ['-e', ''], undefined, undefined, controller.signal);
      controller.abort();
      const result = await run;
      assert.equal(result.exitCode, 130);
      assert.match(result.stderr, platform === 'darwin' ? /process group had already exited/i : /termination failed/i);
      assert.doesNotMatch(result.stderr, /SIGKILL|was terminated|was signaled/);
    });
  }

  it('returns skipped_leader_exited on win32 without invoking taskkill when the leader already exited', () => {
    let called = false;
    const exitedChild = { pid: 4242, exitCode: 0, signalCode: null, kill: () => { called = true; return true; } } as unknown as ChildProcess;
    const outcome = killProcessTree(exitedChild, 'SIGKILL', {
      platform: 'win32',
      runTaskkill: () => {
        called = true;
        return { status: 0 };
      },
    });
    assert.equal(outcome, 'skipped_leader_exited');
    assert.equal(called, false);
  });
});

describe('NodeProcessRunner — relative SN_SDK_CREDENTIALS_DIR normalization', () => {
  it('passes the same resolved absolute SN_SDK_CREDENTIALS_DIR to children across different working directories', {
    timeout: TEST_TIMEOUT_MS,
  }, async () => {
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-cwd-a-'));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-cwd-b-'));
    const relativeCredDir = path.join('..', 'shared-creds-store');
    const expectedAbs = path.resolve(process.cwd(), relativeCredDir);
    const restoreEnv = withEnvironment({ SN_SDK_CREDENTIALS_DIR: relativeCredDir });

    try {
      const runner = new NodeProcessRunner();
      const [resA, resB] = await Promise.all([
        runner.run(process.execPath, ['-e', 'process.stdout.write(process.env.SN_SDK_CREDENTIALS_DIR || "")'], dirA),
        runner.run(process.execPath, ['-e', 'process.stdout.write(process.env.SN_SDK_CREDENTIALS_DIR || "")'], dirB),
      ]);
      assert.equal(resA.exitCode, 0);
      assert.equal(resB.exitCode, 0);
      assert.equal(resA.stdout, expectedAbs);
      assert.equal(resB.stdout, expectedAbs);
    } finally {
      restoreEnv();
      fs.rmSync(dirA, { recursive: true, force: true });
      fs.rmSync(dirB, { recursive: true, force: true });
    }
  });
});

describe('NodeProcessRunner — external signal termination never reports success', {
  skip: process.platform === 'win32' && 'POSIX signals',
}, () => {
  it('reports a non-zero exit code, terminatedBySignal, and signal note when the child dies to an external signal', { timeout: TEST_TIMEOUT_MS }, async () => {
    const runner = new NodeProcessRunner();
    const result = await runner.run(
      process.execPath,
      ['-e', "require('node:fs').writeSync(1, 'before-signal'); process.kill(process.pid, 'SIGTERM');"]
    );

    assert.equal(result.exitCode, 143); // 128 + SIGTERM (15)
    assert.equal(result.terminatedBySignal, 'SIGTERM');
    assert.ok(result.stdout.includes('before-signal'));
    assert.match(result.stderr, /terminated by signal SIGTERM/i);
  });

  it('CLIExecutor marks a signal-terminated child as failed and carries terminatedBySignal', { timeout: TEST_TIMEOUT_MS }, async () => {
    const result = await new CLIExecutor(new NodeProcessRunner()).process(
      process.execPath,
      ['-e', "process.kill(process.pid, 'SIGTERM');"]
    );

    assert.equal(result.success, false);
    assert.equal(result.exitCode, 143);
    assert.equal(result.terminatedBySignal, 'SIGTERM');
    assert.match(result.error?.message ?? '', /terminated by signal SIGTERM/i);
  });
});

describe('NodeProcessRunner — output is bounded (P0.4)', () => {
  it('truncates oversized stdout to head + tail with an elision marker', { timeout: TEST_TIMEOUT_MS }, async () => {
    const runner = new NodeProcessRunner({ maxOutputChars: 200 }); // head 120 / tail 80
    const result = await runner.run(
      process.execPath,
      // 2000 'A' (head region) followed by 2000 'B' (tail region).
      ['-e', "process.stdout.write('A'.repeat(2000) + 'B'.repeat(2000))"]
    );

    assert.equal(result.exitCode, 0);
    // Bounded well below the 4000 chars emitted.
    assert.ok(result.stdout.length < 300);
    // Head retained, tail retained, middle elided with a marker.
    assert.ok(result.stdout.startsWith('A'));
    assert.ok(result.stdout.endsWith('B'));
    assert.match(result.stdout, /characters truncated/);
  });

  it('does not truncate output within the budget', { timeout: TEST_TIMEOUT_MS }, async () => {
    const runner = new NodeProcessRunner({ maxOutputChars: 200 });
    const result = await runner.run(
      process.execPath,
      ["-e", "process.stdout.write('short output')"]
    );

    assert.equal(result.stdout, 'short output');
    assert.doesNotMatch(result.stdout, /characters truncated/);
  });

  it('flags a cut stdout, and lets a call raise the stdout cap without raising stderr\'s', { timeout: TEST_TIMEOUT_MS }, async () => {
    const runner = new NodeProcessRunner({ maxOutputChars: 200 });
    const childArgs = ['-e', "process.stdout.write('A'.repeat(2000)); process.stderr.write('E'.repeat(2000))"];

    const bounded = await runner.run(process.execPath, childArgs);
    assert.equal(bounded.stdoutTruncated, true);

    const raised = await runner.run(process.execPath, childArgs, undefined, undefined, undefined, { maxStdoutChars: 5000 });
    assert.equal(raised.stdout, 'A'.repeat(2000));
    assert.equal(raised.stdoutTruncated, undefined);
    assert.match(raised.stderr, /characters truncated/);
  });
});
