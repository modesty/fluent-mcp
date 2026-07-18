/**
 * Robustness acceptance tests for NodeProcessRunner (plan P0.2 / P0.3 / P0.4):
 *  - P0.2: a timeout terminates the child and RESOLVES with the buffered partial
 *          output + a non-zero exit code (rather than rejecting and discarding),
 *          and an operator/config timeout override supersedes the per-call value.
 *  - P0.3: an external abort signal (MCP client cancellation) kills the child.
 *  - P0.4: stdout/stderr are bounded (head + tail + elision marker).
 *
 * These spawn real short-lived Node child processes (config is globally mocked
 * in setup.js, providing servicenowSdk.commandTimeoutMs).
 */
import { NodeProcessRunner } from '../../src/tools/processors/processRunner.js';

/** A child that writes `text` to stdout immediately, then hangs indefinitely. */
function hangingChildArgs(text: string): string[] {
  return ['-e', `process.stdout.write(${JSON.stringify(text)}); setInterval(() => {}, 1000);`];
}

describe('NodeProcessRunner — timeout returns partial output (P0.2)', () => {
  it('resolves (does not reject) with buffered stdout and a non-zero exit on timeout', async () => {
    const runner = new NodeProcessRunner();
    const result = await runner.run(
      process.execPath,
      hangingChildArgs('partial-before-timeout'),
      undefined,
      undefined,
      250 // per-call timeout
    );

    // Partial stdout is preserved, not discarded.
    expect(result.stdout).toContain('partial-before-timeout');
    // Distinct non-zero exit code (124 = timeout convention).
    expect(result.exitCode).toBe(124);
    // A human-readable note is appended to stderr.
    expect(result.stderr).toMatch(/timed out after 250ms/i);
  });

  it('honors an operator/config timeout override over the per-call timeout', async () => {
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

    expect(result.exitCode).toBe(124);
    expect(Date.now() - start).toBeLessThan(5_000); // proves the override, not the 10-min value, applied
  });
});

describe('NodeProcessRunner — client cancellation kills the child (P0.3)', () => {
  it('aborting the signal terminates the process and returns partial output', async () => {
    const runner = new NodeProcessRunner();
    const controller = new AbortController();

    // Abort shortly after the child has emitted its first output. If the child
    // were NOT killed it hangs forever and this test would time out.
    const timer = setTimeout(() => controller.abort(), 150);
    const result = await runner.run(
      process.execPath,
      hangingChildArgs('emitted-then-cancelled'),
      undefined,
      undefined,
      600_000, // long timeout so the *signal*, not the timeout, ends the process
      controller.signal
    );
    clearTimeout(timer);

    expect(result.stdout).toContain('emitted-then-cancelled');
    expect(result.exitCode).toBe(130); // cancellation convention
    expect(result.stderr).toMatch(/cancelled/i);
  });

  it('kills immediately when the signal is already aborted', async () => {
    const runner = new NodeProcessRunner();
    const result = await runner.run(
      process.execPath,
      hangingChildArgs('never-mind'),
      undefined,
      undefined,
      600_000,
      AbortSignal.abort()
    );

    expect(result.exitCode).toBe(130);
    expect(result.stderr).toMatch(/cancelled/i);
  });
});

describe('NodeProcessRunner — output is bounded (P0.4)', () => {
  it('truncates oversized stdout to head + tail with an elision marker', async () => {
    const runner = new NodeProcessRunner({ maxOutputChars: 200 }); // head 120 / tail 80
    const result = await runner.run(
      process.execPath,
      // 2000 'A' (head region) followed by 2000 'B' (tail region).
      ['-e', "process.stdout.write('A'.repeat(2000) + 'B'.repeat(2000))"]
    );

    expect(result.exitCode).toBe(0);
    // Bounded well below the 4000 chars emitted.
    expect(result.stdout.length).toBeLessThan(300);
    // Head retained, tail retained, middle elided with a marker.
    expect(result.stdout.startsWith('A')).toBe(true);
    expect(result.stdout.endsWith('B')).toBe(true);
    expect(result.stdout).toMatch(/characters truncated/);
  });

  it('does not truncate output within the budget', async () => {
    const runner = new NodeProcessRunner({ maxOutputChars: 200 });
    const result = await runner.run(
      process.execPath,
      ["-e", "process.stdout.write('short output')"]
    );

    expect(result.stdout).toBe('short output');
    expect(result.stdout).not.toMatch(/characters truncated/);
  });
});
