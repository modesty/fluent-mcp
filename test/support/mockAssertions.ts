/**
 * Call-history assertions for native `mock.fn()` values.
 *
 * Native mocks expose `fn.mock.calls[i].arguments`, so these helpers check
 * calls directly (any call matches; no call matches) without a matcher library.
 * Argument comparison uses strict deep equality.
 */
import assert from 'node:assert/strict';
import { inspect, isDeepStrictEqual } from 'node:util';

/** Minimal shape of a native mock function: anything with recorded calls. */
export interface RecordedMock {
  mock: { calls: ReadonlyArray<{ arguments: unknown[] }> };
}

/**
 * Asserts that at least one call received exactly the expected arguments.
 */
export function assertCalledWith(fn: RecordedMock, ...expected: unknown[]): void {
  const received = fn.mock.calls.map((call) => call.arguments);
  assert.ok(
    received.some((args) => isDeepStrictEqual(args, expected)),
    `expected a call with ${inspect(expected)}; received ${inspect(received)}`
  );
}

/** Asserts that a mock was called exactly `times` times. */
export function assertCalledTimes(fn: RecordedMock, times: number): void {
  assert.equal(fn.mock.calls.length, times);
}

/** Asserts that a mock was never called. */
export function assertNotCalled(fn: RecordedMock): void {
  assert.equal(fn.mock.calls.length, 0, `expected no calls; received ${inspect(fn.mock.calls.map((c) => c.arguments))}`);
}
