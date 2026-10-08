/**
 * Tests for InstallCommand with SDK v4.5.0 --skip-flow-activation flag
 */
import { InstallCommand } from '../../src/tools/commands/installCommand.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());
jest.mock('../../src/utils/sessionManager.js', () => require('../mocks/index.js').createSessionManagerMock());

describe('InstallCommand', () => {
  let mockProcessor: { process: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessor = {
      process: jest.fn().mockResolvedValue({
        success: true,
        output: 'Mock install output',
        exitCode: 0
      })
    };
  });

  describe('Command metadata', () => {
    test('should have correct name and description', () => {
      const command = new InstallCommand(mockProcessor as any);
      expect(command.name).toBe('deploy_fluent_app');
      expect(command.description).toContain('Deploy');
    });

    test('should have skipFlowActivation argument', () => {
      const command = new InstallCommand(mockProcessor as any);
      const skipArg = command.arguments.find(arg => arg.name === 'skipFlowActivation');

      expect(skipArg).toBeDefined();
      expect(skipArg?.type).toBe('boolean');
      expect(skipArg?.required).toBe(false);
      expect(skipArg?.description).toContain('flow activation');
    });

    test('should advertise workingDirectory, auth, skipFlowActivation, async, and debug', () => {
      const command = new InstallCommand(mockProcessor as any);
      const argNames = command.arguments.map(arg => arg.name);
      expect(argNames).toEqual(['workingDirectory', 'auth', 'skipFlowActivation', 'async', 'debug']);
    });

    test('should describe async as the SDK v4.12.0+ default with a synchronous escape hatch', () => {
      const command = new InstallCommand(mockProcessor as any);
      const asyncArg = command.arguments.find(arg => arg.name === 'async');
      expect(asyncArg?.type).toBe('boolean');
      expect(asyncArg?.required).toBe(false);
      expect(asyncArg?.description).toContain('CLI default true since SDK v4.12.0');
      expect(asyncArg?.description).toContain('Set false to force a synchronous install');
    });

    test('should budget 15 minutes because the async install poll has no CLI-side cap', () => {
      // SDK v4.12.0 polls the install tracker with `while (true)`; the runner
      // timeout is the only bound, and killing mid-poll skips flow activation.
      const command = new InstallCommand(mockProcessor as any);
      expect(command.timeoutMs).toBe(900_000);
    });
  });

  describe('Command execution', () => {
    test('should execute install without skipFlowActivation', async () => {
      const command = new InstallCommand(mockProcessor as any);
      const result = await command.execute({});

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'install'],
        '/mock/working/dir',
        undefined, // stdinInput
        900000,   // timeoutMs
        undefined  // signal
      );
    });

    test('should add --skip-flow-activation flag when true', async () => {
      const command = new InstallCommand(mockProcessor as any);
      const result = await command.execute({ skipFlowActivation: true });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'install', '--skip-flow-activation'],
        '/mock/working/dir',
        undefined, // stdinInput
        900000,   // timeoutMs
        undefined  // signal
      );
    });

    test('should NOT add --skip-flow-activation flag when false', async () => {
      const command = new InstallCommand(mockProcessor as any);
      const result = await command.execute({ skipFlowActivation: false });

      expect(result.success).toBe(true);
      const processArgs = mockProcessor.process.mock.calls[0][1];
      expect(processArgs).not.toContain('--skip-flow-activation');
    });

    test('should emit the yargs negation --no-async when async is false', async () => {
      const command = new InstallCommand(mockProcessor as any);
      await command.execute({ async: false });

      const processArgs = mockProcessor.process.mock.calls[0][1];
      expect(processArgs).toEqual(['/test/node_modules/@servicenow/sdk/bin/index.js', 'install', '--no-async']);
    });

    test('should emit --async when async is true and nothing when it is omitted', async () => {
      const command = new InstallCommand(mockProcessor as any);
      await command.execute({ async: true });
      await command.execute({});

      expect(mockProcessor.process.mock.calls[0][1]).toContain('--async');
      expect(mockProcessor.process.mock.calls[1][1]).not.toContain('--async');
      expect(mockProcessor.process.mock.calls[1][1]).not.toContain('--no-async');
    });

    test('should include auth and skip-flow-activation together', async () => {
      const command = new InstallCommand(mockProcessor as any);
      const result = await command.execute({
        auth: 'my-alias',
        skipFlowActivation: true,
        debug: true
      });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'install', '--auth', 'my-alias', '--skip-flow-activation', '--debug'],
        '/mock/working/dir',
        undefined, // stdinInput
        900000,   // timeoutMs
        undefined  // signal
      );
    });
  });
});
