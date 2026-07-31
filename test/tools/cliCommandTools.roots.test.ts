/**
 * Tests for CLI command tools with Root capability
 */
import { CLIExecutor } from '../../src/tools/processors/cliExecutor.js';
import { CLICmdWriter } from '../../src/tools/processors/cliCmdWriter.js';
import { NodeProcessRunner } from '../../src/tools/processors/processRunner.js';
import { CommandResult } from '../../src/utils/types.js';
import { setRoots } from '../../src/utils/rootContext.js';

// Mock the process runner
const mockRun = jest.fn();
jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());

// Create a mock ProcessRunner implementation
const mockProcessRunner = {
  run: mockRun
};

describe('CLI Command Tools with Root capability', () => {
  let cliExecutor: CLIExecutor;
  let cliCmdWriter: CLICmdWriter;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockRun.mockResolvedValue({
      stdout: 'mock stdout',
      stderr: '',
      exitCode: 0
    });
    
    cliExecutor = new CLIExecutor(mockProcessRunner);
    cliCmdWriter = new CLICmdWriter();
    setRoots([]);
  });
  
  describe('CLIExecutor with Root capability', () => {
    test('should use primary root when useMcpCwd is true', async () => {
      // Set up roots
      const testRoots = [
        { uri: '/test/root1', name: 'Test Root 1' },
        { uri: '/test/root2', name: 'Test Root 2' }
      ];
      setRoots(testRoots);

      // Execute command with useMcpCwd=true
      await cliExecutor.execute('test-command', ['arg1', 'arg2'], true);

      // Verify that the primary root was used
      expect(mockRun).toHaveBeenCalledWith(
        'test-command',
        ['arg1', 'arg2'],
        '/test/root1',
        undefined, // stdinInput
        undefined, // timeoutMs
        undefined  // signal
      );
    });

    test('should use custom working directory when provided', async () => {
      // Set up roots
      const testRoots = [
        { uri: '/test/root1', name: 'Test Root 1' }
      ];
      setRoots(testRoots);

      // Execute command with custom working directory
      await cliExecutor.execute('test-command', ['arg1'], true, '/custom/dir');

      // Verify that the custom directory was used instead of root
      expect(mockRun).toHaveBeenCalledWith(
        'test-command',
        ['arg1'],
        '/custom/dir',
        undefined, // stdinInput
        undefined, // timeoutMs
        undefined  // signal
      );
    });

    test('should leave cwd unresolved when no roots are set', async () => {
      // Execute command with useMcpCwd=true but no roots set
      await cliExecutor.execute('test-command', ['arg1'], true);

      // Processors do not invent the installed package directory.
      expect(mockRun).toHaveBeenCalledWith(
        'test-command',
        ['arg1'],
        undefined,
        undefined, // stdinInput
        undefined, // timeoutMs
        undefined  // signal
      );
    });
  });
  
  describe('CLICmdWriter with Root capability', () => {
    test('should include primary root in command text when useMcpCwd is true', async () => {
      // Set up roots
      const testRoots = [
        { uri: '/test/root1', name: 'Test Root 1' }
      ];
      setRoots(testRoots);
      
      // Generate command text with useMcpCwd=true
      const result = await cliCmdWriter.execute('test-command', ['arg1'], true) as CommandResult;
      
      // Verify that the command text includes the root directory
      expect(result.output).toContain('/test/root1');
    });
    
    test('should use custom working directory in command text when provided', async () => {
      // Set up roots
      const testRoots = [
        { uri: '/test/root1', name: 'Test Root 1' }
      ];
      setRoots(testRoots);
      
      // Generate command text with custom working directory
      const result = await cliCmdWriter.execute('test-command', ['arg1'], true, '/custom/dir') as CommandResult;
      
      // Verify that the command text includes the custom directory
      expect(result.output).toContain('/custom/dir');
    });
    
    test('should omit cwd context when no roots are set', async () => {
      // Generate command text with useMcpCwd=true but no roots set
      const result = await cliCmdWriter.execute('test-command', ['arg1'], true) as CommandResult;
      
      expect(result.output).not.toContain('(in directory:');
    });
  });
});
