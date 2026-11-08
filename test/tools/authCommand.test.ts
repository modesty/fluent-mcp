import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor, CommandResult } from '../../src/utils/types.js';

// AuthCommand reads the neutral project root from config and resolves the
// bundled SDK CLI; both, and the logger, are replaced with fixtures.
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

describe('AuthCommand', () => {
  let authCommand: InstanceType<typeof AuthCommand>;
  let mockCmdWriter: ReturnType<typeof createMockCmdWriter>;

  beforeEach(() => {
    mockCmdWriter = createMockCmdWriter();
    authCommand = new AuthCommand(mockCmdWriter);
  });

  it('only lists profiles: auth --list from the neutral package directory, with the default timeout', async () => {
    const result = await authCommand.execute();

    assert.equal(mockCmdWriter.process.mock.callCount(), 1);
    const [command, argv, cwd, timeoutMs, signal] = mockCmdWriter.process.mock.calls[0].arguments;
    assert.equal(command, process.execPath);
    assert.deepEqual(argv, [SDK_BIN, 'auth', '--list']);
    assert.equal(cwd, PROJECT_ROOT);
    assert.equal(timeoutMs, undefined);
    assert.equal(signal, undefined);
    assert.equal(result.success, true);
  });

  it('passes --debug through', async () => {
    await authCommand.execute({ debug: true });

    assert.deepEqual(mockCmdWriter.process.mock.calls[0].arguments[1], [SDK_BIN, 'auth', '--list', '--debug']);
  });

  // The profile store and its default profile are shared by every now-sdk run
  // on the machine, so the server has no way to write them (W9 review).
  it('rejects add: the server never writes the profile store', async () => {
    // The internal AuthCommand is held to the same strict schema as tools/call.
    await assert.rejects(authCommand.execute({ add: 'https://dev.service-now.com' }), /Input validation error/);
    assert.equal(mockCmdWriter.process.mock.callCount(), 0);
  });
});
