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

  it('accepts a value with trailing non-digits (parseInt semantics)', () => {
    assert.equal(parseCommandTimeoutOverride('300000ms'), 300000);
  });

  for (const bad of ['0', '-5', 'abc', '', '   ']) {
    it(`rejects non-positive / non-numeric ${JSON.stringify(bad)}`, () => {
      assert.equal(parseCommandTimeoutOverride(bad), undefined);
    });
  }
});
