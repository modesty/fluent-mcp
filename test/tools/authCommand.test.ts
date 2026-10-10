import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor, CommandResult } from '../../src/utils/types.js';

// AuthCommand reads the neutral project root from config, resolves the bundled
// SDK CLI, and logs. All three are replaced with fixtures.
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);

const { AuthCommand } = await import('../../src/tools/commands/authCommand.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';
// configFixture().getProjectRootPath() returns this neutral root; AuthCommand uses it as cwd.
const PROJECT_ROOT = '/test';

type ProcessFn = CommandProcessor['process'];

// Create mock CLICmdWriter for tests
function createMockCmdWriter() {
  // Mock process method that returns a generated command text
  const processFn = mock.fn<ProcessFn>(async (command, args) => {
    const argsText = args.join(' ');
    return {
      success: true,
      output: `${command} ${argsText}`,
      exitCode: 0,
    } as CommandResult;
  });
  return { process: processFn } satisfies CommandProcessor;
}

/** Asserts every expected token appears in argv (order-insensitive). */
function assertContainsAll(actual: readonly string[], expected: readonly string[]): void {
  for (const token of expected) {
    assert.ok(actual.includes(token), `expected argv to contain ${JSON.stringify(token)}; received ${JSON.stringify(actual)}`);
  }
}

describe('AuthCommand', () => {
  let authCommand: InstanceType<typeof AuthCommand>;
  let mockCmdWriter: ReturnType<typeof createMockCmdWriter>;

  beforeEach(() => {
    mockCmdWriter = createMockCmdWriter();
    authCommand = new AuthCommand(mockCmdWriter);
  });

  it('should have correct properties', () => {
    assert.equal(authCommand.name, 'manage_fluent_auth');
    assert.ok(authCommand.description.includes('Manage Fluent (ServiceNow SDK) authentication'));
    const argNames = authCommand.arguments.map((a) => a.name);
    assertContainsAll(argNames, ['add', 'type', 'alias', 'list', 'delete', 'use', 'debug']);
    assert.ok(!argNames.includes('instanceUrl'));
  });

  it('should execute auth command with --add value and optional flags', async () => {
    const args = {
      add: 'foo', // instance name or URL
      type: 'basic',
      alias: 'bar',
    };

    const result = await authCommand.execute(args);

    assert.equal(mockCmdWriter.process.mock.callCount(), 1);
    const [command, argv, cwd, stdinInput, timeoutMs, signal] = mockCmdWriter.process.mock.calls[0].arguments;
    assert.equal(command, process.execPath);
    assertContainsAll(argv, [SDK_BIN, 'auth', '--add', 'foo', '--type', 'basic', '--alias', 'bar']);
    assert.equal(cwd, PROJECT_ROOT);
    assert.equal(stdinInput, undefined); // credentials not set in env
    assert.equal(timeoutMs, undefined);
    assert.equal(signal, undefined);
    assert.equal(result.success, true);
  });

  // Add a comment explaining the relationship between execute and process
  it('should handle relationship between execute and process methods', () => {
    // The command.execute method should call the commandProcessor.process method
    // This is a key part of the refactoring to ensure AuthCommand uses CLICmdWriter properly

    const args = { list: true };

    authCommand.execute(args);

    // Verify the process method of the command processor was called
    assert.ok(mockCmdWriter.process.mock.callCount() > 0);
  });

  it('should pass through --list, --help and --version', async () => {
    const args = { list: true, help: true, version: true };
    await authCommand.execute(args);

    assert.equal(mockCmdWriter.process.mock.callCount(), 1);
    const [command, argv, cwd, stdinInput, timeoutMs, signal] = mockCmdWriter.process.mock.calls[0].arguments;
    assert.equal(command, process.execPath);
    assertContainsAll(argv, [SDK_BIN, 'auth', '--list', '--help', '--version']);
    assert.equal(cwd, PROJECT_ROOT);
    assert.equal(stdinInput, undefined); // not needed for list/help/version
    assert.equal(timeoutMs, undefined);
    assert.equal(signal, undefined);
  });

  it('should error when multiple primary flags provided', async () => {
    const result = await authCommand.execute({ list: true, use: 'bar' });
    assert.equal(result.success, false);
    assert.ok(result.error instanceof Error);
    assert.ok((result.error as Error).message.includes('Provide only one of'));
  });

  it('should validate --type choices', async () => {
    const result = await authCommand.execute({ add: 'foo', type: 'invalid' });
    assert.equal(result.success, false);
    assert.ok((result.error as Error).message.includes('Invalid --type'));
  });
});
