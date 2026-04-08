/**
 * Tests for InstallCommand with SDK v4.5.0 --skip-flow-activation flag
 */
import { InstallCommand } from '../../src/tools/commands/installCommand.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());
jest.mock('../../src/utils/rootContext.js', () => require('../mocks/index.js').createRootContextMock());
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

    test('should have three arguments: auth, skipFlowActivation, debug', () => {
      const command = new InstallCommand(mockProcessor as any);
      expect(command.arguments).toHaveLength(3);

      const argNames = command.arguments.map(arg => arg.name);
      expect(argNames).toContain('auth');
      expect(argNames).toContain('skipFlowActivation');
      expect(argNames).toContain('debug');
    });
  });

  describe('Command execution', () => {
    test('should execute install without skipFlowActivation', async () => {
      const command = new InstallCommand(mockProcessor as any);
      const result = await command.execute({});

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'install'],
        false,
        '/mock/working/dir',
        undefined // stdinInput
      );
    });

    test('should add --skip-flow-activation flag when true', async () => {
      const command = new InstallCommand(mockProcessor as any);
      const result = await command.execute({ skipFlowActivation: true });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'install', '--skip-flow-activation'],
        false,
        '/mock/working/dir',
        undefined // stdinInput
      );
    });

    test('should NOT add --skip-flow-activation flag when false', async () => {
      const command = new InstallCommand(mockProcessor as any);
      const result = await command.execute({ skipFlowActivation: false });

      expect(result.success).toBe(true);
      const processArgs = mockProcessor.process.mock.calls[0][1];
      expect(processArgs).not.toContain('--skip-flow-activation');
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
        'npx',
        ['now-sdk', 'install', '--auth', 'my-alias', '--skip-flow-activation', '--debug'],
        false,
        '/mock/working/dir',
        undefined // stdinInput
      );
    });
  });
});
