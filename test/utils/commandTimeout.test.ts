/**
 * P0.2: the FLUENT_MCP_COMMAND_TIMEOUT_MS operator override is honored only for a
 * positive integer; everything else falls back to per-command / configured
 * defaults. Config wires this helper into `commandTimeoutOverrideMs`, and the
 * process runner applies that override ahead of any per-call timeout
 * (see processRunner.robustness.test.ts).
 */
import { parseCommandTimeoutOverride } from '../../src/utils/commandTimeout.js';

describe('parseCommandTimeoutOverride', () => {
  it('returns undefined when the env var is unset', () => {
    expect(parseCommandTimeoutOverride(undefined)).toBeUndefined();
  });

  it('parses a positive integer to milliseconds', () => {
    expect(parseCommandTimeoutOverride('450000')).toBe(450000);
    expect(parseCommandTimeoutOverride('1')).toBe(1);
  });

  it('accepts a value with trailing non-digits (parseInt semantics)', () => {
    expect(parseCommandTimeoutOverride('300000ms')).toBe(300000);
  });

  it.each(['0', '-5', 'abc', '', '   '])('rejects non-positive / non-numeric %p', (bad) => {
    expect(parseCommandTimeoutOverride(bad)).toBeUndefined();
  });
});
