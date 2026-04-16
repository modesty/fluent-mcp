/**
 * Tests for new SDK commands: Download, Clean, and Pack
 */
import { CommandFactory } from '../../src/tools/registry/commandFactory.js';
import { NodeProcessRunner } from '../../src/tools/processors/processRunner.js';
import { DownloadCommand, CleanCommand, PackCommand, ExplainCommand } from '../../src/tools/commands/index.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());
jest.mock('../../src/utils/rootContext.js', () => require('../mocks/index.js').createRootContextMock());
jest.mock('../../src/utils/sessionManager.js', () => require('../mocks/index.js').createSessionManagerMock());

describe('New SDK Commands', () => {
  let mockProcessor: { process: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessor = {
      process: jest.fn().mockResolvedValue({
        success: true,
        output: 'Mock command output',
        exitCode: 0
      })
    };
  });

  describe('DownloadCommand', () => {
    test('should create DownloadCommand with correct metadata', () => {
      const command = new DownloadCommand(mockProcessor as any);

      expect(command.name).toBe('download_fluent_app');
      expect(command.description).toContain('Download application metadata from a ServiceNow instance');
      expect(command.arguments).toHaveLength(4);

      // Check required directory argument
      const directoryArg = command.arguments.find(arg => arg.name === 'directory');
      expect(directoryArg).toBeDefined();
      expect(directoryArg?.required).toBe(true);
      expect(directoryArg?.type).toBe('string');
      expect(directoryArg?.description).toBe('Path to expand application');

      // Check optional source argument
      const sourceArg = command.arguments.find(arg => arg.name === 'source');
      expect(sourceArg).toBeDefined();
      expect(sourceArg?.required).toBe(false);
      expect(sourceArg?.type).toBe('string');

      // Check optional incremental argument
      const incrementalArg = command.arguments.find(arg => arg.name === 'incremental');
      expect(incrementalArg).toBeDefined();
      expect(incrementalArg?.required).toBe(false);
      expect(incrementalArg?.type).toBe('boolean');

      // Check optional debug argument
      const debugArg = command.arguments.find(arg => arg.name === 'debug');
      expect(debugArg).toBeDefined();
      expect(debugArg?.required).toBe(false);
      expect(debugArg?.type).toBe('boolean');
    });

    test('should execute download command with required directory', async () => {
      const command = new DownloadCommand(mockProcessor as any);

      const result = await command.execute({ directory: 'my-app' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Mock command output');
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'download', 'my-app'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        60000     // timeoutMs
      );
    });

    test('should execute download command with all arguments', async () => {
      const command = new DownloadCommand(mockProcessor as any);

      const result = await command.execute({
        directory: 'my-app',
        source: './src',
        incremental: true,
        debug: true
      });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'download', 'my-app', '--source', './src', '--incremental', '--debug'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        60000     // timeoutMs
      );
    });
  });

  describe('CleanCommand', () => {
    test('should create CleanCommand with correct metadata', () => {
      const command = new CleanCommand(mockProcessor as any);

      expect(command.name).toBe('clean_fluent_app');
      expect(command.description).toContain('Delete the build output directory');
      expect(command.arguments).toHaveLength(2);

      // Check optional source argument
      const sourceArg = command.arguments.find(arg => arg.name === 'source');
      expect(sourceArg).toBeDefined();
      expect(sourceArg?.required).toBe(false);
      expect(sourceArg?.type).toBe('string');
      expect(sourceArg?.description).toBe('Path to the directory that contains package.json configuration');

      // Check optional debug argument
      const debugArg = command.arguments.find(arg => arg.name === 'debug');
      expect(debugArg).toBeDefined();
      expect(debugArg?.required).toBe(false);
      expect(debugArg?.type).toBe('boolean');
    });

    test('should execute clean command without arguments', async () => {
      const command = new CleanCommand(mockProcessor as any);

      const result = await command.execute({});

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'clean'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        15000     // timeoutMs
      );
    });

    test('should execute clean command with source and debug', async () => {
      const command = new CleanCommand(mockProcessor as any);

      const result = await command.execute({
        source: 'src',
        debug: true
      });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'clean', '--source', 'src', '--debug'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        15000     // timeoutMs
      );
    });
  });

  describe('PackCommand', () => {
    test('should create PackCommand with correct metadata', () => {
      const command = new PackCommand(mockProcessor as any);

      expect(command.name).toBe('pack_fluent_app');
      expect(command.description).toContain('Package a built Fluent');
      expect(command.arguments).toHaveLength(2);

      // Check optional source argument
      const sourceArg = command.arguments.find(arg => arg.name === 'source');
      expect(sourceArg).toBeDefined();
      expect(sourceArg?.required).toBe(false);
      expect(sourceArg?.type).toBe('string');
      expect(sourceArg?.description).toBe('Path to the directory that contains package.json configuration');

      // Check optional debug argument
      const debugArg = command.arguments.find(arg => arg.name === 'debug');
      expect(debugArg).toBeDefined();
      expect(debugArg?.required).toBe(false);
      expect(debugArg?.type).toBe('boolean');
    });

    test('should execute pack command without arguments', async () => {
      const command = new PackCommand(mockProcessor as any);

      const result = await command.execute({});

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'pack'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        30000     // timeoutMs
      );
    });

    test('should execute pack command with source and debug', async () => {
      const command = new PackCommand(mockProcessor as any);

      const result = await command.execute({
        source: './build',
        debug: true
      });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'pack', '--source', './build', '--debug'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        30000     // timeoutMs
      );
    });
  });

  describe('ExplainCommand', () => {
    test('should create ExplainCommand with correct metadata', () => {
      const command = new ExplainCommand(mockProcessor as any);

      expect(command.name).toBe('explain_fluent_api');
      expect(command.description).toContain('Display documentation for a Fluent API');
      expect(command.annotations).toEqual({ readOnlyHint: true, idempotentHint: true });
      expect(command.arguments).toHaveLength(3);

      // Check required api argument
      const apiArg = command.arguments.find(arg => arg.name === 'api');
      expect(apiArg).toBeDefined();
      expect(apiArg?.required).toBe(true);
      expect(apiArg?.type).toBe('string');

      // Check optional source argument
      const sourceArg = command.arguments.find(arg => arg.name === 'source');
      expect(sourceArg).toBeDefined();
      expect(sourceArg?.required).toBe(false);
      expect(sourceArg?.type).toBe('string');

      // Check optional debug argument
      const debugArg = command.arguments.find(arg => arg.name === 'debug');
      expect(debugArg).toBeDefined();
      expect(debugArg?.required).toBe(false);
      expect(debugArg?.type).toBe('boolean');
    });

    test('should execute explain command with explicit source', async () => {
      const command = new ExplainCommand(mockProcessor as any);

      const result = await command.execute({
        api: 'Acl',
        source: './src',
        debug: true
      });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'explain', 'Acl', '--source', './src', '--debug'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        15000     // timeoutMs
      );
    });

    test('should use working directory when it is a valid Fluent project', async () => {
      const command = new ExplainCommand(mockProcessor as any);
      // Mock the private method to report the working dir as a valid Fluent project
      jest.spyOn(command as any, 'isFluentProject').mockResolvedValue(true);

      const result = await command.execute({ api: 'BusinessRule' });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'explain', 'BusinessRule'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        15000     // timeoutMs
      );
    });

    test('should fall back to scaffold when working directory is not a Fluent project', async () => {
      const command = new ExplainCommand(mockProcessor as any);
      jest.spyOn(command as any, 'isFluentProject').mockResolvedValue(false);
      jest.spyOn(command as any, 'ensureScaffoldDir').mockResolvedValue('/mock/scaffold');

      const result = await command.execute({ api: 'Table' });

      expect(result.success).toBe(true);
      // Should inject --source pointing to the scaffold directory
      expect(mockProcessor.process).toHaveBeenCalledWith(
        'npx',
        ['now-sdk', 'explain', 'Table', '--source', '/mock/scaffold'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        15000     // timeoutMs
      );
    });

    test('should return error when scaffold creation fails', async () => {
      const command = new ExplainCommand(mockProcessor as any);
      jest.spyOn(command as any, 'isFluentProject').mockResolvedValue(false);
      jest.spyOn(command as any, 'ensureScaffoldDir').mockResolvedValue(undefined);

      const result = await command.execute({ api: 'BusinessRule' });

      expect(result.success).toBe(false);
      expect(result.output).toContain('scaffold');
    });
  });

  describe('CommandFactory Integration', () => {
    test('should include new commands in CommandFactory.createCommands', () => {
      const mockExecutor = { process: jest.fn() };
      const commands = CommandFactory.createCommands(mockExecutor as any);

      const commandNames = commands.map(cmd => cmd.name);

      expect(commandNames).toContain('download_fluent_app');
      expect(commandNames).toContain('clean_fluent_app');
      expect(commandNames).toContain('pack_fluent_app');
      expect(commandNames).toContain('explain_fluent_api');
    });
  });
});
