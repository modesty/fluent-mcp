/**
 * Tests for InstallCommand with SDK v4.5.0 --skip-flow-activation flag
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledWith } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor } from '../../src/utils/types.js';

// Session replacement: the command resolves its working directory from the
// initialized session, which this suite pins to a fixed path.
const session = {
  getWorkingDirectory: mock.fn((): string | undefined => '/mock/working/dir'),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(),
  setAuthValidationResult: mock.fn(),
};

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => session } },
});

const { InstallCommand } = await import('../../src/tools/commands/installCommand.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessFn = CommandProcessor['process'];

describe('InstallCommand', () => {
  let mockProcessor: { process: ReturnType<typeof mock.fn<ProcessFn>> };

  beforeEach(() => {
    mockProcessor = {
      process: mock.fn<ProcessFn>(async () => ({
        success: true,
        output: 'Mock install output',
        exitCode: 0,
      })),
    };
  });

  describe('Command metadata', () => {
    it('should have correct name and description', () => {
      const command = new InstallCommand(mockProcessor);
      assert.equal(command.name, 'deploy_fluent_app');
      assert.ok(command.description.includes('Deploy'));
    });

    it('should have skipFlowActivation argument', () => {
      const command = new InstallCommand(mockProcessor);
      const skipArg = command.arguments.find(arg => arg.name === 'skipFlowActivation');

      assert.notEqual(skipArg, undefined);
      assert.equal(skipArg?.type, 'boolean');
      assert.equal(skipArg?.required, false);
      assert.ok(skipArg?.description.includes('flow activation'));
    });

    it('should advertise workingDirectory, auth, skipFlowActivation, async, and debug', () => {
      const command = new InstallCommand(mockProcessor);
      const argNames = command.arguments.map(arg => arg.name);
      assert.deepStrictEqual(argNames, ['workingDirectory', 'auth', 'skipFlowActivation', 'async', 'debug']);
    });

    it('should describe async as the SDK v4.12.0+ default with a synchronous escape hatch', () => {
      const command = new InstallCommand(mockProcessor);
      const asyncArg = command.arguments.find(arg => arg.name === 'async');
      assert.equal(asyncArg?.type, 'boolean');
      assert.equal(asyncArg?.required, false);
      assert.ok(asyncArg?.description.includes('CLI default true since SDK v4.12.0'));
      assert.ok(asyncArg?.description.includes('Set false to force a synchronous install'));
    });

    it('should budget 15 minutes because the async install poll has no CLI-side cap', () => {
      // SDK v4.12.0 polls the install tracker with `while (true)`; the runner
      // timeout is the only bound, and killing mid-poll skips flow activation.
      const command = new InstallCommand(mockProcessor);
      assert.equal(command.timeoutMs, 900_000);
    });
  });

  describe('Command execution', () => {
    it('should execute install without skipFlowActivation', async () => {
      const command = new InstallCommand(mockProcessor);
      const result = await command.execute({});

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'install'],
        '/mock/working/dir',
        undefined, // stdinInput
        900000,   // timeoutMs
        undefined  // signal
      );
    });

    it('should add --skip-flow-activation flag when true', async () => {
      const command = new InstallCommand(mockProcessor);
      const result = await command.execute({ skipFlowActivation: true });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'install', '--skip-flow-activation'],
        '/mock/working/dir',
        undefined, // stdinInput
        900000,   // timeoutMs
        undefined  // signal
      );
    });

    it('should NOT add --skip-flow-activation flag when false', async () => {
      const command = new InstallCommand(mockProcessor);
      const result = await command.execute({ skipFlowActivation: false });

      assert.equal(result.success, true);
      const processArgs = mockProcessor.process.mock.calls[0].arguments[1];
      assert.ok(!processArgs.includes('--skip-flow-activation'));
    });

    it('should emit the yargs negation --no-async when async is false', async () => {
      const command = new InstallCommand(mockProcessor);
      await command.execute({ async: false });

      const processArgs = mockProcessor.process.mock.calls[0].arguments[1];
      assert.deepStrictEqual(processArgs, [SDK_BIN, 'install', '--no-async']);
    });

    it('should emit --async when async is true and nothing when it is omitted', async () => {
      const command = new InstallCommand(mockProcessor);
      await command.execute({ async: true });
      await command.execute({});

      assert.ok(mockProcessor.process.mock.calls[0].arguments[1].includes('--async'));
      assert.ok(!mockProcessor.process.mock.calls[1].arguments[1].includes('--async'));
      assert.ok(!mockProcessor.process.mock.calls[1].arguments[1].includes('--no-async'));
    });

    it('should include auth and skip-flow-activation together', async () => {
      const command = new InstallCommand(mockProcessor);
      const result = await command.execute({
        auth: 'my-alias',
        skipFlowActivation: true,
        debug: true
      });

      assert.equal(result.success, true);
      assertCalledWith(
        mockProcessor.process,
        process.execPath,
        [SDK_BIN, 'install', '--auth', 'my-alias', '--skip-flow-activation', '--debug'],
        '/mock/working/dir',
        undefined, // stdinInput
        900000,   // timeoutMs
        undefined  // signal
      );
    });
  });
});
