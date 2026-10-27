/**
 * Call-history assertions for native `mock.fn()` values.
 *
 * Native mocks expose `fn.mock.calls[i].arguments`, so these helpers check
 * calls directly (any call matches; no call matches) without a matcher library.
 * Argument comparison uses strict deep equality, ignoring trailing `undefined`
 * arguments: a callee cannot tell `f(a)` from `f(a, undefined)`.
 */
import assert from 'node:assert/strict';
import { inspect, isDeepStrictEqual } from 'node:util';

/** Minimal shape of a native mock function: anything with recorded calls. */
export interface RecordedMock {
  mock: { calls: ReadonlyArray<{ arguments: unknown[] }> };
}

/** The arguments without trailing `undefined` entries. */
function withoutTrailingUndefined(args: readonly unknown[]): unknown[] {
  let end = args.length;
  while (end > 0 && args[end - 1] === undefined) end--;
  return args.slice(0, end);
}

/**
 * Asserts that at least one call received exactly the expected arguments.
 */
export function assertCalledWith(fn: RecordedMock, ...expected: unknown[]): void {
  const received = fn.mock.calls.map((call) => call.arguments);
  const wanted = withoutTrailingUndefined(expected);
  assert.ok(
    received.some((args) => isDeepStrictEqual(withoutTrailingUndefined(args), wanted)),
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
