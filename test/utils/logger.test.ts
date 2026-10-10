/**
 * Tests for the real stderr-only logger pipeline.
 *
 * The logger under test is the real module. Only configuration is pinned (the
 * Jest setup supplied logLevel 'info'), so the minimum-level assertion does not
 * depend on FLUENT_MCP_LOG_LEVEL in the environment.
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { configFixture, captureStderr } from '../support/fixtures.js';

mock.module('../../src/config.js', configFixture().mockOptions);

const { Logger } = await import('../../src/utils/logger.js');

describe('Logger stderr pipeline', () => {
  it('writes a structured line to stderr', (t) => {
    const stderr = captureStderr(t);
    const logger = new Logger();

    logger.info('hello world', { code: 42 });

    assert.equal(stderr.length, 1);
    const line = String(stderr[0]);
    assert.ok(line.includes('[INFO]: hello world'));
    assert.ok(line.includes('"code":42'));
  });

  it('honors the configured minimum level', (t) => {
    const stderr = captureStderr(t);
    const logger = new Logger();

    logger.debug('hidden');
    logger.warn('visible');

    assert.equal(stderr.length, 1);
    assert.ok(String(stderr[0]).includes('[WARNING]: visible'));
  });
});
