/**
 * Jest setup file that runs before all tests
 * This file handles global mocks that should be applied before any other imports
 */

// Automatically mock the config module
jest.mock('../src/config.js', () => ({
  getProjectRootPath: jest.fn(() => process.cwd()),
  getConfig: jest.fn().mockReturnValue({
    name: "test",
    version: "0.0.0",
    description: "Test description",
    logLevel: "info",
    resourcePaths: {
      spec: "/test/res/spec",
      snippet: "/test/res/snippet",
      instruct: "/test/res/instruct",
    },
    servicenowSdk: {
      cliPath: "snc",
      commandTimeoutMs: 30000,
    },
  }),
  findMissingResourcePaths: jest.fn().mockReturnValue([]),
}));

// Globally mock logger to suppress stderr output during tests
jest.mock('../src/utils/logger.js', () => require('./mocks/index.js').createLoggerMock());

// Globally mock SDK CLI resolution to a deterministic invocation so legacy
// command tests assert stable args. Production resolution is covered in
// test/utils/sdkCli.test.ts (which un-mocks this module).
jest.mock('../src/utils/sdkCli.js', () => ({
  resolveSdkCli: jest.fn(() => ({
    command: process.execPath,
    baseArgs: ['/test/node_modules/@servicenow/sdk/bin/index.js'],
  })),
  resetSdkCliCache: jest.fn(),
}));
