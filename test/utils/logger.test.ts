/**
 * Tests for the real stderr-only logger pipeline.
 *
 * The logger under test is the real module. Only configuration is pinned (logLevel 'info' unless a
 * test swaps it), so no assertion depends on FLUENT_MCP_LOG_LEVEL in the environment.
 */
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { configFixture, captureStderr, TEST_CONFIG } from '../support/fixtures.js';

const config = configFixture();
mock.module('../../src/config.js', config.mockOptions);

const { Logger, parseLogLevel } = await import('../../src/utils/logger.js');

/** Construct a logger as the server would with FLUENT_MCP_LOG_LEVEL=<logLevel>. */
function loggerAt(logLevel: string) {
  config.getConfig.mock.mockImplementation(() => ({ ...TEST_CONFIG, logLevel }));
  return new Logger();
}

afterEach(() => {
  config.getConfig.mock.mockImplementation(() => ({ ...TEST_CONFIG }));
});

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

  it('serializes the name, message and stack of an error, next to the context', (t) => {
    const stderr = captureStderr(t);
    const logger = new Logger();
    const failure = new TypeError('boom');

    logger.error('command failed', failure, { tool: 'build_fluent_app' });

    assert.equal(stderr.length, 1);
    const line = String(stderr[0]);
    assert.ok(line.includes('[ERROR]: command failed'));
    const context = JSON.parse(line.slice(line.indexOf('{')));
    assert.equal(context.tool, 'build_fluent_app');
    assert.deepEqual(
      { name: context.error.name, message: context.error.message },
      { name: 'TypeError', message: 'boom' }
    );
    assert.ok(String(context.error.stack).startsWith('TypeError: boom'));
  });
});

describe('Minimum level from FLUENT_MCP_LOG_LEVEL', () => {
  for (const [raw, expected] of [
    ['warn', 'warning'], ['WARN', 'warning'], [' Warning ', 'warning'], ['debug', 'debug'], ['ERROR', 'error'],
  ] as const) {
    it(`reads ${JSON.stringify(raw)} as ${expected}`, () => {
      assert.equal(parseLogLevel(raw), expected);
    });
  }

  for (const raw of ['verbose', 'warnings', '', '  ', undefined, 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    it(`reads ${JSON.stringify(raw)} as no level`, () => {
      assert.equal(parseLogLevel(raw), undefined);
    });
  }

  it('keeps warnings and errors at "warn" (it used to drop every line)', (t) => {
    const stderr = captureStderr(t);
    const logger = loggerAt('warn');

    logger.info('hidden');
    logger.warn('visible');
    logger.error('also visible');

    assert.deepEqual(stderr.map((line) => String(line).match(/\[(\w+)\]: (.*?)(?: \{|$)/)?.slice(1, 3)), [
      ['WARNING', 'visible'],
      ['ERROR', 'also visible'],
    ]);
  });

  it('keeps logging at an inherited property name (it used to drop every line, errors too)', (t) => {
    const stderr = captureStderr(t);
    const logger = loggerAt('constructor');

    logger.debug('hidden');
    logger.error('visible');

    assert.equal(stderr.length, 2);
    assert.match(String(stderr[0]), /\[WARNING\]: Unknown FLUENT_MCP_LOG_LEVEL "constructor"; using "info"/);
    assert.ok(String(stderr[1]).includes('[ERROR]: visible'));
  });

  it('falls back to info for an unknown level and says so once', (t) => {
    const stderr = captureStderr(t);
    const logger = loggerAt('verbose');

    logger.debug('hidden');
    logger.info('visible');

    assert.equal(stderr.length, 2);
    assert.match(String(stderr[0]), /\[WARNING\]: Unknown FLUENT_MCP_LOG_LEVEL "verbose"; using "info"/);
    assert.ok(String(stderr[1]).includes('[INFO]: visible'));
  });
});
