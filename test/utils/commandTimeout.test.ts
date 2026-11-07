/**
 * P0.2: the FLUENT_MCP_COMMAND_TIMEOUT_MS operator override is honored only for a
 * positive integer; everything else falls back to per-command / configured
 * defaults. Config wires this helper into `commandTimeoutOverrideMs`, and the
 * process runner applies that override ahead of any per-call timeout
 * (see processRunner.robustness.test.ts).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommandTimeoutOverride } from '../../src/utils/commandTimeout.js';

describe('parseCommandTimeoutOverride', () => {
  it('returns undefined when the env var is unset', () => {
    assert.equal(parseCommandTimeoutOverride(undefined), undefined);
  });

  it('parses a positive integer to milliseconds', () => {
    assert.equal(parseCommandTimeoutOverride('450000'), 450000);
    assert.equal(parseCommandTimeoutOverride('1'), 1);
  });

  it('accepts the longest delay a Node timer can wait for (2^31 - 1 ms)', () => {
    assert.equal(parseCommandTimeoutOverride('2147483647'), 2_147_483_647);
  });

  it('allows surrounding whitespace', () => {
    assert.equal(parseCommandTimeoutOverride(' 300000 '), 300000);
  });

  // parseInt read '1e6' and '1.5' as 1 ms, and the override wins over every
  // per-command timeout, so each of these used to kill every command at once.
  // Above 2^31 - 1 Node fires the timer after 1 ms (TimeoutOverflowWarning), the
  // same kill-at-once failure.
  for (const bad of ['0', '-5', 'abc', '', '   ', '1e6', '1.5', '300000ms', '0x10', '+5', '2147483648', '9007199254740993']) {
    it(`rejects ${JSON.stringify(bad)}`, () => {
      assert.equal(parseCommandTimeoutOverride(bad), undefined);
    });
  }
});
