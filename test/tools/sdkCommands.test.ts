import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledTimes } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CLICommand, ProcessResult } from '../../src/utils/types.js';

// The SDK commands read the neutral project root and resolve the bundled CLI
// through config/sdkCli, both replaced explicitly here.
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);

// Import command tools from individual modules
const { CommandFactory } = await import('../../src/tools/registry/commandFactory.js');
const { CLIExecutor } = await import('../../src/tools/processors/cliExecutor.js');
const { NodeProcessRunner } = await import('../../src/tools/processors/processRunner.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

// Mock the NodeProcessRunner for testing
class MockProcessRunner extends NodeProcessRunner {
  mockResult: ProcessResult = {
    stdout: 'mock output',
    stderr: '',
    exitCode: 0
  };

  setMockResult(result: ProcessResult) {
    this.mockResult = result;
  }

  async run(_command: string, args: string[] = [], _cwd?: string, _stdinInput?: string): Promise<ProcessResult> {
    // Return different mocked responses based on args
    if (args.includes('--version') || args.includes('-v')) {
      // `now-sdk --version` prints the bare version (verified on SDK 4.14.0).
      return {
        stdout: '4.14.0',
        stderr: '',
        exitCode: 0
      };
    } else if (args.includes('--help') || args.includes('-h')) {
      return {
        stdout: 'ServiceNow SDK Help information',
        stderr: '',
        exitCode: 0
      };
    }

    return this.mockResult;
  }
}

describe('SDK Command Tools', () => {
  let mockRunner: MockProcessRunner;
  let executor: InstanceType<typeof CLIExecutor>;
  let commands: CLICommand[];

  /** The SdkInfoCommand, which every test in this suite drives. */
  function sdkInfo(): CLICommand {
    const sdkInfoCommand = commands.find((cmd) => cmd.name === 'sdk_info');
    assert.notEqual(sdkInfoCommand, undefined);
    return sdkInfoCommand as CLICommand;
  }

  beforeEach(() => {
    mockRunner = new MockProcessRunner();
    executor = new CLIExecutor(mockRunner);
    commands = CommandFactory.createCommands(executor, executor);
  });

  it('SdkInfoCommand should execute correctly with -v flag', async () => {
    const sdkInfoCommand = sdkInfo();

    const result = await sdkInfoCommand.execute({ flag: '-v' });
    assert.equal(result.success, true);
    // The bare version has no "ServiceNow SDK v" prefix to extract from, so the
    // command presents it as is.
    assert.equal(result.output, 'ServiceNow SDK Version Information:\n\n4.14.0');
  });

  it('SdkInfoCommand should execute correctly with -h flag (general help)', async () => {
    const sdkInfoCommand = sdkInfo();

    const result = await sdkInfoCommand.execute({ flag: '-h' });
    assert.equal(result.success, true);
    assert.ok(result.output.includes('ServiceNow SDK Help information'));
  });

  it('SdkInfoCommand should execute correctly with -h flag and specific command', async () => {
    const sdkInfoCommand = sdkInfo();

    // Set up specific mock response
    const mockOutput = 'Help for auth command';
    const mockExitCode = 0;

    // Override the run method directly for this test
    const originalRun = mockRunner.run;
    const run = mock.fn(async (
      _command: string,
      args: string[] = [],
      _cwd?: string,
      _stdinInput?: string,
      _timeoutMs?: number,
      _signal?: AbortSignal
    ): Promise<ProcessResult> => {
      // Check if this is the specific auth help command we're testing
      if (args.includes('auth') && args.includes('--help')) {
        return {
          stdout: mockOutput,
          stderr: '',
          exitCode: mockExitCode
        };
      }

      // Otherwise call the original implementation
      return originalRun.call(mockRunner, _command, args);
    });
    mockRunner.run = run;

    // Execute the command
    const result = await sdkInfoCommand.execute({ flag: '-h', command: 'auth' });

    // Verify the command succeeded
    assert.equal(result.success, true);

    // Verify the mock output is correctly returned in the result
    assert.ok(result.output.includes(mockOutput));
    assert.equal(result.exitCode, mockExitCode);
    assert.equal(result.error, undefined);

    // Verify the command was called with expected arguments
    assertCalledTimes(run, 1);
    const [command, args, cwd, stdinInput, timeoutMs, signal] = run.mock.calls[0].arguments;
    assert.equal(command, process.execPath);
    for (const token of [SDK_BIN, 'auth', '--help']) {
      assert.ok(args?.includes(token), `expected argv to contain ${token}; received ${JSON.stringify(args)}`);
    }
    assert.equal(typeof cwd, 'string'); // Working directory should be provided (project root path)
    assert.equal(stdinInput, undefined);
    assert.equal(timeoutMs, 10000);
    assert.equal(signal, undefined);

    // Restore the original run method
    mockRunner.run = originalRun;
  });

  it('SdkInfoCommand should reject -lm flag (no longer supported)', async () => {
    const sdkInfoCommand = sdkInfo();

    await assert.rejects(
      sdkInfoCommand.execute({ flag: '-lm' }),
      /Argument 'flag' must be one of: -v, --version, -h, --help\. Received: "-lm"/
    );
  });

  it('SdkInfoCommand should reject a help command that begins with "-"', async () => {
    const sdkInfoCommand = sdkInfo();

    await assert.rejects(
      sdkInfoCommand.execute({ flag: '--help', command: '--debug' }),
      /Argument 'command' must be a command name: letters, digits, "_" and "-", not beginning with "-"\. Received: "--debug"/
    );
  });

  it('SdkInfoCommand should handle missing required flag parameter', async () => {
    const sdkInfoCommand = sdkInfo();

    await assert.rejects(sdkInfoCommand.execute({}), /Missing required argument 'flag'/);
  });

  it('SdkInfoCommand should handle errors correctly', async () => {
    const sdkInfoCommand = sdkInfo();

    // Override the run method directly for this specific test
    const originalRun = mockRunner.run;
    mockRunner.run = async () => {
      return {
        stdout: '',
        stderr: 'Command not found',
        exitCode: 1
      };
    };

    const result = await sdkInfoCommand.execute({ flag: '-v' });
    assert.equal(result.success, false);
    assert.equal(result.exitCode, 1);
    assert.notEqual(result.error, undefined);

    // Restore the original run method
    mockRunner.run = originalRun;
  });
});
