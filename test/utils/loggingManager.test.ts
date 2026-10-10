/**
 * Tests for LoggingManager
 *
 * Native runner: the logger and config mocks are registered before the module
 * under test is imported, so it is loaded with dynamic import() below them.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledWith } from '../support/mockAssertions.js';
import { configFixture, loggerFixture } from '../support/fixtures.js';

// Mock the logger (the code under test imports the default export)
const { logger, mockOptions: loggerOptions } = loggerFixture();
mock.module('../../src/utils/logger.js', loggerOptions);
mock.module('../../src/config.js', configFixture().mockOptions);

const { LoggingManager } = await import('../../src/utils/loggingManager.js');
const { ServerStatus } = await import('../../src/types.js');

describe('LoggingManager', () => {
  let loggingManager: InstanceType<typeof LoggingManager>;

  beforeEach(() => {
    for (const level of Object.values(logger)) level.mock.resetCalls();
    loggingManager = new LoggingManager();
  });

  it('should log server starting', () => {
    // Act
    loggingManager.logServerStarting();

    // Assert: message plus a context carrying a string version
    assert.ok(
      logger.info.mock.calls.some(
        ({ arguments: args }) =>
          args[0] === 'Starting MCP server...' &&
          typeof (args[1] as { version?: unknown } | undefined)?.version === 'string'
      )
    );
  });

  const authStatusCases = [
    ['authenticated', 'info'],
    ['skipped', 'debug'],
    ['not_authenticated', 'notice'],
    ['validation_error', 'warn'],
  ] as const;

  for (const [status, method] of authStatusCases) {
    it(`should log ${status} auth status at ${method} severity`, () => {
      loggingManager.logAuthValidationResult({
        status,
        message: `Auth status: ${status}`,
        timestamp: '2026-07-29T00:00:00.000Z',
        alias: 'dev',
        host: 'dev.example.com',
        authType: 'oauth',
        actionRequired: 'now-sdk auth --add https://dev.example.com',
      });

      assertCalledWith(logger[method], `Auth status: ${status}`, {
        status,
        timestamp: '2026-07-29T00:00:00.000Z',
        alias: 'dev',
        host: 'dev.example.com',
        authType: 'oauth',
        actionRequired: 'now-sdk auth --add https://dev.example.com',
      });
    });
  }

  it('should log server started', () => {
    // Act
    loggingManager.logServerStarted();

    // Assert
    assertCalledWith(logger.info, 'MCP server initialized and connected via stdio');
  });

  it('should log server already running', () => {
    // Act
    loggingManager.logServerAlreadyRunning();

    // Assert
    assertCalledWith(logger.info, 'MCP server is already running');
  });

  it('should log server not running', () => {
    // Act
    loggingManager.logServerNotRunning(ServerStatus.STOPPED);

    // Assert
    assertCalledWith(logger.info, 'MCP server is not running', { status: ServerStatus.STOPPED });
  });

  it('should log server stopping', () => {
    // Act
    loggingManager.logServerStopping();

    // Assert
    assertCalledWith(logger.info, 'Stopping MCP server...');
  });

  it('should log server stopped', () => {
    // Act
    loggingManager.logServerStopped();

    // Assert
    assertCalledWith(logger.info, 'MCP server stopped');
  });

  it('should log server start failed', () => {
    // Arrange
    const error = new Error('Test error');

    // Act
    loggingManager.logServerStartFailed(error, ServerStatus.STOPPED);

    // Assert
    assertCalledWith(logger.error, 'Failed to start MCP server', error, { status: ServerStatus.STOPPED });
  });

  it('should log server stop failed', () => {
    // Arrange
    const error = new Error('Test error');

    // Act
    loggingManager.logServerStopFailed(error, ServerStatus.STOPPING);

    // Assert
    assertCalledWith(logger.error, 'Error stopping MCP server', error, { status: ServerStatus.STOPPING });
  });

  it('should log resource listing failed', () => {
    // Arrange
    const error = new Error('Test error');

    // Act
    loggingManager.logResourceListingFailed(error);

    // Assert
    assertCalledWith(logger.error, 'Error listing resources', error);
  });
});
