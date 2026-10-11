/**
 * Unit tests for InitCommand
 *
 * Native runner:
 * - SessionManager is replaced by a module mock registered before InitCommand is
 *   imported, so setWorkingDirectory calls can be asserted on a shared handle.
 * - The logger and SDK CLI resolution use the shared fixtures ; resolveSdkCli()
 *   yields process.execPath plus
 *   the fixed SDK entry point the argv assertions expect.
 * - The filesystem, os.homedir and FluentAppValidator are spied on the shared
 *   builtin / class objects with the running test's mock tracker, so they are
 *   restored when each test ends (no restoreAllMocks hook is needed).
 */
import { beforeEach, describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CommandResult } from '../../src/utils/types.js';
import { assertCalledTimes, assertCalledWith, assertNotCalled } from '../support/mockAssertions.js';
import { loggerFixture, sdkCliFixture } from '../support/fixtures.js';

// Create a virtual filesystem helper
interface FluentAppInfo {
  hasApp: boolean;
  scopeName?: string;
  packageName?: string;
}

class VirtualFileSystem {
  private existingDirs: Set<string> = new Set<string>();
  private fluentApps: Map<string, FluentAppInfo> = new Map();

  reset(): void {
    this.existingDirs.clear();
    this.fluentApps.clear();
  }

  addExistingDirectory(path: string): void {
    this.existingDirs.add(path);
  }

  markAsFluentApp(path: string, scopeName: string, packageName: string): void {
    this.addExistingDirectory(path);
    this.fluentApps.set(path, {
      hasApp: true,
      scopeName,
      packageName
    });
  }

  directoryExists(path: string): boolean {
    return this.existingDirs.has(path);
  }

  createDirectory(path: string): void {
    this.existingDirs.add(path);
  }

  getFluentAppInfo(path: string): FluentAppInfo {
    return this.fluentApps.get(path) || { hasApp: false };
  }

  exists(path: string): boolean {
    return this.existingDirs.has(path);
  }

  isDirectory(path: string): boolean {
    return this.existingDirs.has(path);
  }

  readdir(path: string): string[] {
    if (path === '/dir-with-package') {
      return ['package.json'];
    }
    if (path === '/dir-with-config') {
      return ['now.config.json'];
    }
    return [];
  }
}

const mockFs = new VirtualFileSystem();

// SessionManager mock: getInstance() always returns the same instance, so the
// assertions read setWorkingDirectory straight from it.
const sessionInstance = {
  getWorkingDirectory: mock.fn(() => '/mock/working/dir'),
  setWorkingDirectory: mock.fn((_directory: string): void => undefined),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(() => undefined),
  setAuthValidationResult: mock.fn(),
};
const SessionManager = {
  getInstance: mock.fn(() => sessionInstance),
};
mock.module('../../src/utils/sessionManager.js', { namedExports: { SessionManager } });

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);

const { InitCommand } = await import('../../src/tools/commands/initCommand.js');
const { FluentAppValidator } = await import('../../src/utils/fluentAppValidator.js');

describe('InitCommand', () => {
  let initCommand: InstanceType<typeof InitCommand>;
  let processMock: ReturnType<typeof createProcessMock>;
  let mockExecutor: { process: typeof processMock };
  let mkdirSyncSpy: { mock: { calls: ReadonlyArray<{ arguments: unknown[] }> } };
  // What the readdirSync spy answers; a test reassigns it to change the directory listing.
  let readdirResult: (path: string) => string[];

  /** A command processor whose process() succeeds with a canned init result. */
  function createProcessMock() {
    return mock.fn(
      async (_command: string, _args: string[], _workingDir?: string): Promise<CommandResult> => ({
        success: true,
        output: 'Mock init command executed successfully',
        exitCode: 0,
      })
    );
  }

  /**
   * Asserts that some process() call ran process.execPath in `workingDirectory`
   * with exactly three arguments, the middle one (the SDK argv) accepted by `accepts`.
   */
  function assertProcessCalledWithSdkArgs(
    accepts: (sdkArgs: string[]) => boolean,
    workingDirectory: string,
    expectation: string
  ): void {
    const calls = processMock.mock.calls.map((call) => call.arguments as unknown[]);
    assert.ok(
      calls.some(
        (args) =>
          args.length === 3 &&
          args[0] === process.execPath &&
          Array.isArray(args[1]) &&
          accepts(args[1] as string[]) &&
          args[2] === workingDirectory
      ),
      `expected a process() call with ${expectation}; received ${inspect(calls)}`
    );
  }

  /** Every expected value is present, in any order. */
  const containsAll = (expected: string[]) => (sdkArgs: string[]) =>
    expected.every((value) => sdkArgs.includes(value));

  beforeEach((hook) => {
    // A beforeEach hook runs with the current test's context, so every spy
    // installed below is restored when the test ends.
    const t = hook as TestContext;

    // Reset the shared SessionManager mock's call history
    SessionManager.getInstance.mock.resetCalls();
    for (const fn of Object.values(sessionInstance)) fn.mock.resetCalls();

    // Reset the virtual filesystem
    mockFs.reset();
    // Setup initial filesystem state
    mockFs.addExistingDirectory('/valid-dir');
    mockFs.markAsFluentApp('/existing-app-dir', 'x_test_scope', 'test-package');

    // Create a mock processor
    processMock = createProcessMock();
    mockExecutor = { process: processMock };

    // Mock file system - must be done BEFORE creating the command
    t.mock.method(fs, 'existsSync', (path: unknown) => {
      return mockFs.directoryExists(String(path));
    });

    t.mock.method(fs, 'statSync', (path: unknown) => {
      const pathStr = String(path);
      if (!mockFs.exists(pathStr)) {
        throw new Error(`ENOENT: no such file or directory, stat '${pathStr}'`);
      }
      return {
        isDirectory: () => mockFs.isDirectory(pathStr),
        isFile: () => !mockFs.isDirectory(pathStr),
      };
    });

    readdirResult = (path) => mockFs.readdir(path);
    t.mock.method(fs, 'readdirSync', (path: unknown) => readdirResult(String(path)));

    mkdirSyncSpy = t.mock.method(fs, 'mkdirSync', (path: unknown) => {
      mockFs.createDirectory(String(path));
      return undefined;
    });

    // Mock os.homedir
    t.mock.method(os, 'homedir', () => '/mock-home');

    // Mock FluentAppValidator
    t.mock.method(FluentAppValidator, 'checkFluentAppExists', async (directory: string) => {
      const info = mockFs.getFluentAppInfo(directory);
      if (info.hasApp) {
        return {
          hasApp: true,
          scopeName: info.scopeName,
          packageName: info.packageName,
        };
      }
      return { hasApp: false };
    });

    initCommand = new InitCommand(mockExecutor);
  });

  it('should have correct properties', () => {
    assert.equal(initCommand.name, 'init_fluent_app');
    assert.ok(initCommand.description.includes('Initialize a new Fluent'));
    assert.ok(initCommand.description.includes('convert'));
    assert.ok(initCommand.arguments.length > 0);

    const intentArg = initCommand.arguments.find((arg) => arg.name === 'intent');
    assert.equal(intentArg?.required, false);
    assert.ok(intentArg?.description.includes('conversion'));
    assert.ok(intentArg?.description.includes('creation'));

    const workingDirArg = initCommand.arguments.find((arg) => arg.name === 'workingDirectory');
    assert.equal(workingDirArg?.required, true);

    const templateArg = initCommand.arguments.find((arg) => arg.name === 'template');
    assert.equal(templateArg?.required, false); // Only required for creation intent, not globally
    assert.ok(templateArg?.description.includes('For creation only'));

    const appNameArg = initCommand.arguments.find((arg) => arg.name === 'appName');
    assert.equal(appNameArg?.required, false);
    assert.ok(appNameArg?.description.includes('For creation'));

    const scopeNameArg = initCommand.arguments.find((arg) => arg.name === 'scopeName');
    assert.equal(scopeNameArg?.required, false);
    assert.ok(scopeNameArg?.description.includes('x_'));

    const fromArg = initCommand.arguments.find((arg) => arg.name === 'from');
    assert.equal(fromArg?.required, false);
    assert.ok(fromArg?.description.includes('For conversion'));
  });

  // MCP 2026-07-28 (SEP-2322) removed server-initiated requests, so the tool no
  // longer asks the client for missing values. Every argument must arrive with
  // the tools/call, and an incomplete bag must fail with an actionable message
  // rather than hang on a round trip that is no longer legal.
  it('should fail with an actionable error when no intent can be determined', async () => {
    const result = await initCommand.execute({});

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Cannot determine intent for init_fluent_app'));
    // Names both modes and their required arguments
    assert.ok(result.error?.message.includes("intent to 'creation'"));
    assert.ok(result.error?.message.includes("intent to 'conversion'"));
    assert.ok(result.error?.message.includes('appName'));
    assert.ok(result.error?.message.includes('from'));
    // Never reaches the SDK
    assertNotCalled(mockExecutor.process);
  });

  it('should never issue a server-initiated request for missing input', async () => {
    // Guards the regression the 2026-07-28 migration removed: no code path may
    // reach back to the client. A bare intent with no data must fail locally.
    const result = await initCommand.execute({ intent: 'creation' });

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Required parameters for creation are missing'));
    assertNotCalled(mockExecutor.process);
  });

  it('should fail with an actionable error when conversion is missing from', async () => {
    const result = await initCommand.execute({
      intent: 'conversion',
      workingDirectory: '/valid-dir',
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Required parameters for conversion are missing: from'));
    assertNotCalled(mockExecutor.process);
  });

  it('should treat null and blank arguments as absent when reporting missing input', async () => {
    // MCP clients commonly serialize an omitted optional value as null.
    const result = await initCommand.execute({
      intent: 'creation',
      appName: 'Test App',
      packageName: null,
      scopeName: '   ',
      workingDirectory: '/valid-dir',
      template: 'javascript.react',
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Required parameters for creation are missing'));
    assert.ok(result.error?.message.includes('packageName'));
    assert.ok(result.error?.message.includes('scopeName'));
    assert.ok(!result.error?.message.includes('appName'));
  });

  it('should list the valid templates when creation input is incomplete', async () => {
    const result = await initCommand.execute({ intent: 'creation', appName: 'Test App' });

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('typescript.vue'));
  });

  it('should create directory if it does not exist', async () => {
    const args = {
      workingDirectory: '/non-existent-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };
    await initCommand.execute(args);

    assertCalledWith(mkdirSyncSpy, '/non-existent-dir', { recursive: true });
    assertCalledWith(sessionInstance.setWorkingDirectory, '/non-existent-dir');
    assert.ok(mockExecutor.process.mock.callCount() > 0);
  });

  it('should handle existing directory with no Fluent app', async () => {
    mockFs.addExistingDirectory('/valid-dir');
    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };
    await initCommand.execute(args);

    // Should not create directory
    assertNotCalled(mkdirSyncSpy);
    // Should save working directory
    assertCalledWith(sessionInstance.setWorkingDirectory, '/valid-dir');
    // Should execute command
    assert.ok(mockExecutor.process.mock.callCount() > 0);
  });

  it('should handle existing directory with Fluent app', async () => {
    mockFs.markAsFluentApp('/existing-app-dir', 'x_test_scope', 'test-package');
    const args = {
      workingDirectory: '/existing-app-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };
    const result = await initCommand.execute(args);

    assert.equal(result.success, true);
    assert.ok(result.output.includes('already contains'));
    assert.ok(result.output.includes('x_test_scope'));
    // Should save working directory
    assertCalledWith(sessionInstance.setWorkingDirectory, '/existing-app-dir');
    // Should not execute command
    assertNotCalled(mockExecutor.process);
  });

  it('should fail when working directory not provided', async () => {
    const args = {
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Required parameters for creation are missing: workingDirectory'));
  });

  it('should execute conversion with from parameter', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      from: 'a1b2c3d4e5f6789012345678901234ab', // Valid sys_id
      auth: 'test-auth'
    };

    await initCommand.execute(args);

    assertCalledWith(
      mockExecutor.process,
      process.execPath,
      [
        '/test/node_modules/@servicenow/sdk/bin/index.js',
        'init',
        '--from', 'a1b2c3d4e5f6789012345678901234ab',
        '--auth', 'test-auth'
      ],
      '/valid-dir'
    );

    assertCalledWith(sessionInstance.setWorkingDirectory, '/valid-dir');
  });

  it('should execute creation with all required parameters', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'typescript.react',
      auth: 'test-auth'
    };

    await initCommand.execute(args);

    // SDK v4.5.0: init no longer injects --auth for creation (only for conversion)
    assertCalledWith(
      mockExecutor.process,
      process.execPath,
      [
        '/test/node_modules/@servicenow/sdk/bin/index.js',
        'init',
        '--appName', '"Test App"',
        '--packageName', 'test-app',
        '--scopeName', 'x_test_scope',
        '--template', 'typescript.react',
      ],
      '/valid-dir'
    );

    assertCalledWith(sessionInstance.setWorkingDirectory, '/valid-dir');
  });

  it('should succeed for an explicit conversion intent with complete arguments', async () => {
    const result = await initCommand.execute({
      intent: 'conversion',
      from: 'a1b2c3d4e5f6789012345678901234ab',
      workingDirectory: '/valid-dir',
      auth: 'test-auth',
    });

    assert.equal(result.success, true);
    assert.ok(mockExecutor.process.mock.callCount() > 0);
  });

  it('should succeed for an explicit creation intent with complete arguments', async () => {
    const result = await initCommand.execute({
      intent: 'creation',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      workingDirectory: '/valid-dir',
      template: 'javascript.react',
    });

    assert.equal(result.success, true);
    assert.ok(mockExecutor.process.mock.callCount() > 0);
  });


  it('should validate sys_id format for conversion', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      from: 'invalid-sys-id'
    };

    const result = await initCommand.execute(args);
    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('sys_id must be a 32-character hexadecimal string'));
  });

  it('should validate scopeName format for creation', async () => {
    mockFs.addExistingDirectory('/valid-dir');

    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'invalid_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);
    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('scopeName must start with "x_" prefix'));
  });

  it('should validate local path for conversion', async () => {
    mockFs.markAsFluentApp('/existing-path', 'x_existing_scope', 'existing-package');
    const ensureAuthValidated = mock.fn(async () => undefined);
    const localConversionCommand = new InitCommand(mockExecutor, ensureAuthValidated);
    const args = {
      workingDirectory: '/valid-dir',
      from: '/existing-path'
    };

    await localConversionCommand.execute(args);
    assert.ok(mockExecutor.process.mock.callCount() > 0);
    assertNotCalled(ensureAuthValidated);
    assertProcessCalledWithSdkArgs(
      (sdkArgs) => !sdkArgs.includes('--auth'),
      '/valid-dir',
      "no '--auth' argument"
    );
  });

  it('should recognize a bare relative local path without triggering auth validation', async () => {
    mockFs.markAsFluentApp(path.resolve('existing-path'), 'x_existing_scope', 'existing-package');
    const ensureAuthValidated = mock.fn(async () => undefined);
    const localConversionCommand = new InitCommand(mockExecutor, ensureAuthValidated);

    await localConversionCommand.execute({
      workingDirectory: '/valid-dir',
      from: 'existing-path',
    });

    assertNotCalled(ensureAuthValidated);
    assertProcessCalledWithSdkArgs(
      (sdkArgs) => !sdkArgs.includes('--auth'),
      '/valid-dir',
      "no '--auth' argument"
    );
  });

  it('should honor an explicit auth alias for a local conversion without lazy validation', async () => {
    mockFs.markAsFluentApp('/existing-path', 'x_existing_scope', 'existing-package');
    const ensureAuthValidated = mock.fn(async () => undefined);
    const localConversionCommand = new InitCommand(mockExecutor, ensureAuthValidated);

    await localConversionCommand.execute({
      workingDirectory: '/valid-dir',
      from: '/existing-path',
      auth: 'explicit-local-auth',
    });

    assertNotCalled(ensureAuthValidated);
    assertProcessCalledWithSdkArgs(
      containsAll(['--auth', 'explicit-local-auth']),
      '/valid-dir',
      "'--auth explicit-local-auth'"
    );
  });

  it('should lazily validate auth for sys_id conversion without an alias', async () => {
    const ensureAuthValidated = mock.fn(async () => undefined);
    const instanceConversionCommand = new InitCommand(mockExecutor, ensureAuthValidated);

    await instanceConversionCommand.execute({
      workingDirectory: '/valid-dir',
      from: 'a1b2c3d4e5f6789012345678901234ab'
    });

    assertCalledTimes(ensureAuthValidated, 1);
  });

  it('should fail validation for non-existent local path', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      from: '/non-existent-path'
    };

    const result = await initCommand.execute(args);
    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Local path does not exist'));
  });

  it('should create working directory if it does not exist', async () => {
    const args = {
      workingDirectory: '/non-existent-working-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);

    assert.equal(result.success, true);
    assertCalledWith(mkdirSyncSpy, '/non-existent-working-dir', { recursive: true });
  });

  it('should validate working directory is empty (no package.json)', async () => {
    // Make readdirSync report a package.json for this directory. The spy is
    // restored with the test, so no explicit mockRestore is needed.
    readdirResult = (path) => {
      if (path === '/dir-with-package') {
        return ['package.json'];
      }
      return [];
    };

    mockFs.addExistingDirectory('/dir-with-package');

    const args = {
      workingDirectory: '/dir-with-package',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Working directory must not contain package.json'));
  });

  it('should validate working directory is empty (no now.config.json)', async () => {
    // Make readdirSync report a now.config.json for this directory
    readdirResult = (path) => {
      if (path === '/dir-with-config') {
        return ['now.config.json'];
      }
      return [];
    };

    mockFs.addExistingDirectory('/dir-with-config');

    const args = {
      workingDirectory: '/dir-with-config',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Working directory must not contain now.config.json'));
  });

  it('should validate template parameter', async () => {
    mockFs.addExistingDirectory('/valid-dir');

    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'invalid-template'
    };

    const result = await initCommand.execute(args);

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('template must be one of:'));
  });

  it('should determine intent from from parameter', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      from: 'a1b2c3d4e5f6789012345678901234ab'
    };

    await initCommand.execute(args);

    // Should execute conversion flow
    assertProcessCalledWithSdkArgs(
      containsAll(['--from', 'a1b2c3d4e5f6789012345678901234ab']),
      '/valid-dir',
      "'--from <sys_id>'"
    );
  });

  it('should determine intent from creation parameters', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    await initCommand.execute(args);

    // Should execute creation flow
    assertProcessCalledWithSdkArgs(
      containsAll(['--appName', '"Test App"']),
      '/valid-dir',
      "'--appName \"Test App\"'"
    );
  });
});
