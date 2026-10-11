/**
 * Robustness acceptance tests for NodeProcessRunner (plan P0.2 / P0.3 / P0.4):
 *  - P0.2: a timeout terminates the child and RESOLVES with the buffered partial
 *          output + a non-zero exit code (rather than rejecting and discarding),
 *          and an operator/config timeout override supersedes the per-call value.
 *  - P0.3: an external abort signal (MCP client cancellation) kills the child.
 *  - P0.4: stdout/stderr are bounded (head + tail + elision marker).
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
import { configFixture, loggerFixture } from '../support/fixtures.js';

mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { NodeProcessRunner } = await import('../../src/tools/processors/processRunner.js');

/** Explicit per-test timeout (with slack for a loaded machine). */
const TEST_TIMEOUT_MS = 10_000;

/** A child that writes `text` to stdout immediately, then hangs indefinitely. */
function hangingChildArgs(text: string): string[] {
  return ['-e', `process.stdout.write(${JSON.stringify(text)}); setInterval(() => {}, 1000);`];
}

describe('NodeProcessRunner — timeout returns partial output (P0.2)', () => {
  it('resolves (does not reject) with buffered stdout and a non-zero exit on timeout', { timeout: TEST_TIMEOUT_MS }, async () => {
    const runner = new NodeProcessRunner();
    const result = await runner.run(
      process.execPath,
      hangingChildArgs('partial-before-timeout'),
      undefined,
      undefined,
      250 // per-call timeout
    );

    // Partial stdout is preserved, not discarded.
    assert.ok(result.stdout.includes('partial-before-timeout'));
    // Distinct non-zero exit code (124 = timeout convention).
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
      undefined,
      600_000 // caller asked for 10 minutes; the override must clamp to 200ms
    );

    assert.equal(result.exitCode, 124);
    assert.ok(Date.now() - start < 5_000); // proves the override, not the 10-min value, applied
  });
});

describe('NodeProcessRunner — client cancellation kills the child (P0.3)', () => {
  it('aborting the signal terminates the process and returns partial output', { timeout: TEST_TIMEOUT_MS }, async () => {
    const runner = new NodeProcessRunner();
    const controller = new AbortController();

    // Abort shortly after the child has emitted its first output. If the child
    // were NOT killed it hangs forever and this test would time out.
    const timer = setTimeout(() => controller.abort(), 150);
    let result;
    try {
      result = await runner.run(
        process.execPath,
        hangingChildArgs('emitted-then-cancelled'),
        undefined,
        undefined,
        600_000, // long timeout so the *signal*, not the timeout, ends the process
        controller.signal
      );
    } finally {
      clearTimeout(timer);
    }

    assert.ok(result.stdout.includes('emitted-then-cancelled'));
    assert.equal(result.exitCode, 130); // cancellation convention
    assert.match(result.stderr, /cancelled/i);
  });

  it('kills immediately when the signal is already aborted', { timeout: TEST_TIMEOUT_MS }, async () => {
    const runner = new NodeProcessRunner();
    const result = await runner.run(
      process.execPath,
      hangingChildArgs('never-mind'),
      undefined,
      undefined,
      600_000,
      AbortSignal.abort()
    );

    assert.equal(result.exitCode, 130);
    assert.match(result.stderr, /cancelled/i);
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
});
