/**
 * Tests for new SDK commands: Download, Clean, and Pack
 */
import { CommandFactory } from '../../src/tools/cliCommandTools.js';
import { NodeProcessRunner } from '../../src/tools/cliCommandTools.js';
import { DownloadCommand, CleanCommand, PackCommand } from '../../src/tools/commands/index.js';

// Mock the logger module
jest.mock('../../src/utils/logger.js', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock the config module
jest.mock('../../src/config.js', () => ({
  getProjectRootPath: jest.fn().mockReturnValue('/mock/project/root')
}));

// Mock the rootContext module
jest.mock('../../src/utils/rootContext.js', () => ({
  getPrimaryRootPath: jest.fn().mockReturnValue('/mock/root'),
  getPrimaryRootPathFrom: jest.fn().mockReturnValue('/mock/root'),
  setRoots: jest.fn(),
}));

// Mock SessionManager
jest.mock('../../src/utils/sessionManager.js', () => ({
  SessionManager: {
    getInstance: jest.fn().mockReturnValue({
      getWorkingDirectory: jest.fn().mockReturnValue('/mock/working/dir'),
      setWorkingDirectory: jest.fn(),
      getAuthAlias: jest.fn().mockReturnValue(undefined),
      setAuthAlias: jest.fn(),
      getAuthValidationResult: jest.fn().mockReturnValue(undefined),
      setAuthValidationResult: jest.fn(),
    }),
    getWorkingDirectory: jest.fn().mockReturnValue('/mock/working/dir'),
    setWorkingDirectory: jest.fn(),
  }
}));

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
      expect(command.description).toBe('Download application metadata from instance, including metadata that not exist in local but deployed to instance');
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
        '/mock/working/dir'
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
        '/mock/working/dir'
      );
    });
  });

  describe('CleanCommand', () => {
    test('should create CleanCommand with correct metadata', () => {
      const command = new CleanCommand(mockProcessor as any);
      
      expect(command.name).toBe('clean_fluent_app');
      expect(command.description).toBe('Clean up output directory of a Fluent (ServiceNow SDK) application');
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
        '/mock/working/dir'
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
        '/mock/working/dir'
      );
    });
  });

  describe('PackCommand', () => {
    test('should create PackCommand with correct metadata', () => {
      const command = new PackCommand(mockProcessor as any);
      
      expect(command.name).toBe('pack_fluent_app');
      expect(command.description).toBe('Zip built Fluent (ServiceNow SDK) application into installable artifact');
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
        '/mock/working/dir'
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
        '/mock/working/dir'
      );
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
    });
  });
});
