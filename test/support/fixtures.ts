/**
 * Shared native-runner fixtures.
 *
 * Nothing here is global. The Jest setup silently mocked config, logger, and SDK
 * CLI resolution for every suite; native suites opt in explicitly so each file
 * shows its real/mock boundary.
 *
 * Every fixture returns its mock handles plus `mockOptions`, the descriptor for
 * mock.module(). A test file registers the descriptor before importing the module
 * under test, because native module mocks apply only to imports made afterward:
 *
 *   const config = configFixture({ name: 'x' });
 *   mock.module('../../src/config.js', config.mockOptions);
 *   const { ResourceLoader } = await import('../../src/utils/resourceLoader.js');
 */
import { mock } from 'node:test';
import type { TestContext } from 'node:test';

/** Mirrors src/utils/logger.ts LogLevel values (string enum). */
export const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  NOTICE: 'notice',
  WARNING: 'warning',
  WARN: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
  ALERT: 'alert',
  EMERGENCY: 'emergency',
} as const;

/** Defaults matching the configuration the Jest setup used. */
export const TEST_CONFIG = {
  name: 'test',
  version: '0.0.0',
  description: 'Test description',
  logLevel: 'info',
  resourcePaths: {
    spec: '/test/res/spec',
    snippet: '/test/res/snippet',
    instruct: '/test/res/instruct',
  },
  servicenowSdk: {
    cliPath: 'snc',
    commandTimeoutMs: 30000,
  },
};

/**
 * Logger replacement. Every level is a mock.fn so tests can assert on calls;
 * the default and named `logger` exports reference the same object.
 */
export function loggerFixture() {
  const logger = {
    debug: mock.fn(),
    info: mock.fn(),
    notice: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
    critical: mock.fn(),
    alert: mock.fn(),
    emergency: mock.fn(),
  };
  return {
    logger,
    mockOptions: {
      defaultExport: logger,
      namedExports: { logger, LogLevel: LOG_LEVEL },
    },
  };
}

/**
 * Config replacement with the same defaults the Jest setup used.
 * @param overrides top-level TEST_CONFIG fields to replace
 */
export function configFixture(overrides: Partial<typeof TEST_CONFIG> = {}) {
  const config = { ...TEST_CONFIG, ...overrides };
  const getConfig = mock.fn(() => config);
  const getProjectRootPath = mock.fn(() => '/test');
  const findMissingResourcePaths = mock.fn((_config: unknown): string[] => []);
  return {
    getConfig,
    getProjectRootPath,
    findMissingResourcePaths,
    mockOptions: {
      namedExports: { getConfig, getProjectRootPath, findMissingResourcePaths },
    },
  };
}

/**
 * SDK CLI resolution replacement. Resolves to a deterministic invocation so
 * command tests assert stable argv. Production resolution is covered by the
 * sdkCli suite, which must not register this fixture.
 */
export function sdkCliFixture() {
  const resolveSdkCli = mock.fn(() => ({
    command: process.execPath,
    baseArgs: ['/test/node_modules/@servicenow/sdk/bin/index.js'],
  }));
  const resetSdkCliCache = mock.fn();
  return {
    resolveSdkCli,
    resetSdkCliCache,
    mockOptions: {
      namedExports: { resolveSdkCli, resetSdkCliCache },
    },
  };
}

/**
 * Sets environment variables for the duration of a test and returns a function
 * that restores the previous values. `undefined` removes a variable.
 */
export function withEnvironment(overrides: Record<string, string | undefined>): () => void {
  const previous = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(overrides)) {
    previous.set(name, process.env[name]);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  return () => {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

/**
 * Captures process.stderr writes for the current test. The spy is created on the
 * test's own mock tracker, so it is restored automatically when the test ends.
 */
export function captureStderr(t: TestContext): string[] {
  const chunks: string[] = [];
  t.mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  });
  return chunks;
}
