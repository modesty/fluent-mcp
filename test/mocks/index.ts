/**
 * Shared test mock factories
 * Eliminates copy-paste mock duplication across test files
 *
 * Usage:
 *   import { createLoggerMock } from '../mocks/index.js';
 *   jest.mock('../../src/utils/logger.js', () => createLoggerMock());
 */

/**
 * Creates a logger mock with all log levels.
 * The superset mock works for all consumers — tests that only use
 * debug/info/warn/error simply ignore the extra methods.
 */
export function createLoggerMock() {
  const LogLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    NOTICE: 'notice',
    WARNING: 'warning',
    WARN: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical',
    ALERT: 'alert',
    EMERGENCY: 'emergency',
  };

  return {
    LogLevel,
    debug: jest.fn(),
    info: jest.fn(),
    notice: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
    alert: jest.fn(),
    emergency: jest.fn(),
    setMcpServer: jest.fn(),
    setupLoggingHandlers: jest.fn(),
    sendNotification: jest.fn(),
    __esModule: true,
    default: {
      LogLevel,
      debug: jest.fn(),
      info: jest.fn(),
      notice: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      critical: jest.fn(),
      alert: jest.fn(),
      emergency: jest.fn(),
      setMcpServer: jest.fn(),
      setupLoggingHandlers: jest.fn(),
      sendNotification: jest.fn(),
    },
  };
}

/**
 * Creates a SessionManager mock with standard methods
 */
export function createSessionManagerMock(overrides?: Record<string, unknown>) {
  const defaults = {
    getWorkingDirectory: jest.fn().mockReturnValue('/mock/working/dir'),
    setWorkingDirectory: jest.fn(),
    getAuthAlias: jest.fn().mockReturnValue(undefined),
    setAuthAlias: jest.fn(),
    getAuthValidationResult: jest.fn().mockReturnValue(undefined),
    setAuthValidationResult: jest.fn(),
  };

  const instance = { ...defaults, ...overrides };

  return {
    SessionManager: {
      getInstance: jest.fn().mockReturnValue(instance),
      getWorkingDirectory: jest.fn().mockReturnValue('/mock/working/dir'),
      setWorkingDirectory: jest.fn(),
    },
  };
}

/**
 * Creates a rootContext mock with standard resolution functions
 */
export function createRootContextMock(overrides?: Record<string, unknown>) {
  return {
    getPrimaryRootPath: jest.fn().mockReturnValue('/mock/root'),
    getPrimaryRootPathFrom: jest.fn().mockReturnValue('/mock/root'),
    resolveWorkingDirectory: jest.fn().mockReturnValue('/mock/root'),
    setRoots: jest.fn(),
    ...overrides,
  };
}

/**
 * Creates a config mock with standard test values
 */
export function createConfigMock(overrides?: Record<string, unknown>) {
  return {
    getProjectRootPath: jest.fn().mockReturnValue('/mock/project/root'),
    getConfig: jest.fn().mockReturnValue({
      resourcePaths: {
        spec: '/mock/spec',
        snippet: '/mock/snippet',
        instruct: '/mock/instruct',
      },
      ...overrides,
    }),
  };
}
