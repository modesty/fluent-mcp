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
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'download', 'my-app'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        180000,   // timeoutMs
        undefined  // signal
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
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'download', 'my-app', '--source', './src', '--incremental', '--debug'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        180000,   // timeoutMs
        undefined  // signal
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
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'clean'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        15000,    // timeoutMs
        undefined  // signal
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
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'clean', '--source', 'src', '--debug'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        15000,    // timeoutMs
        undefined  // signal
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
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'pack'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        30000,    // timeoutMs
        undefined  // signal
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
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'pack', '--source', './build', '--debug'],
        false,
        '/mock/working/dir',
        undefined, // stdinInput
        30000,    // timeoutMs
        undefined  // signal
      );
    });
  });

  describe('ExplainCommand', () => {
    test('should create ExplainCommand with correct metadata', () => {
      const command = new ExplainCommand(mockProcessor as any);

      expect(command.name).toBe('explain_fluent_api');
      expect(command.description).toContain('Look up Fluent SDK documentation');
      expect(command.description).toContain('no authentication or active Fluent project required');
      expect(command.annotations).toEqual({ readOnlyHint: true, idempotentHint: true });
      expect(command.arguments).toHaveLength(6);

      // topic is optional in v4.6.0 (required only when list=false)
      const topicArg = command.arguments.find(arg => arg.name === 'topic');
      expect(topicArg).toBeDefined();
      expect(topicArg?.required).toBe(false);
      expect(topicArg?.type).toBe('string');

      const listArg = command.arguments.find(arg => arg.name === 'list');
      expect(listArg).toBeDefined();
      expect(listArg?.required).toBe(false);
      expect(listArg?.type).toBe('boolean');

      const peekArg = command.arguments.find(arg => arg.name === 'peek');
      expect(peekArg).toBeDefined();
      expect(peekArg?.required).toBe(false);
      expect(peekArg?.type).toBe('boolean');

      const formatArg = command.arguments.find(arg => arg.name === 'format');
      expect(formatArg).toBeDefined();
      expect(formatArg?.required).toBe(false);
      expect(formatArg?.type).toBe('string');

      const sourceArg = command.arguments.find(arg => arg.name === 'source');
      expect(sourceArg).toBeDefined();
      expect(sourceArg?.required).toBe(false);
      expect(sourceArg?.type).toBe('string');

      const debugArg = command.arguments.find(arg => arg.name === 'debug');
      expect(debugArg).toBeDefined();
      expect(debugArg?.required).toBe(false);
      expect(debugArg?.type).toBe('boolean');
    });

    test('should execute basic topic lookup without --source', async () => {
      const command = new ExplainCommand(mockProcessor as any);

      const result = await command.execute({ topic: 'BusinessRule' });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'explain', 'BusinessRule'],
        false,
        '/mock/working/dir',
        undefined,
        15000,
        undefined
      );
    });

    test('should pass --source when explicitly provided', async () => {
      const command = new ExplainCommand(mockProcessor as any);

      const result = await command.execute({
        topic: 'Acl',
        source: './src',
        debug: true,
      });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'explain', 'Acl', '--source', './src', '--debug'],
        false,
        '/mock/working/dir',
        undefined,
        15000,
        undefined
      );
    });

    test('should pass --list when list=true (no topic required)', async () => {
      const command = new ExplainCommand(mockProcessor as any);

      const result = await command.execute({ list: true });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'explain', '--list'],
        false,
        '/mock/working/dir',
        undefined,
        15000,
        undefined
      );
    });

    test('should combine --list with a topic filter', async () => {
      const command = new ExplainCommand(mockProcessor as any);

      const result = await command.execute({ list: true, topic: 'flow' });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'explain', 'flow', '--list'],
        false,
        '/mock/working/dir',
        undefined,
        15000,
        undefined
      );
    });

    test('should pass --peek and --format=raw', async () => {
      const command = new ExplainCommand(mockProcessor as any);

      const result = await command.execute({
        topic: 'BusinessRule',
        peek: true,
        format: 'raw',
      });

      expect(result.success).toBe(true);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        process.execPath,
        ['/test/node_modules/@servicenow/sdk/bin/index.js', 'explain', 'BusinessRule', '--format', 'raw', '--peek'],
        false,
        '/mock/working/dir',
        undefined,
        15000,
        undefined
      );
    });

    test('should return error when neither topic nor list is provided', async () => {
      const command = new ExplainCommand(mockProcessor as any);

      const result = await command.execute({});

      expect(result.success).toBe(false);
      expect(result.output).toContain('Provide a topic');
      expect(mockProcessor.process).not.toHaveBeenCalled();
    });

    test('should reject invalid format value', async () => {
      const command = new ExplainCommand(mockProcessor as any);

      const result = await command.execute({ topic: 'BusinessRule', format: 'json' });

      expect(result.success).toBe(false);
      expect(result.output).toContain('Invalid format');
      expect(mockProcessor.process).not.toHaveBeenCalled();
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
