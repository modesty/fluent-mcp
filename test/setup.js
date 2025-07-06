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
}));

// Add any other global mocks here
