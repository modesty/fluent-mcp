/**
 * Tests for CLI command tools with Root capability
 */
import { CLIExecutor, CLICmdWriter, NodeProcessRunner } from '../../src/tools/cliCommandTools.js';
import { CommandResult } from '../../src/utils/types.js';

// Mock the process runner
const mockRun = jest.fn();
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
  });
  
  describe('CLIExecutor with Root capability', () => {
    test('should use primary root when useMcpCwd is true', async () => {
      // Set up roots
      const testRoots = [
        { uri: '/test/root1', name: 'Test Root 1' },
        { uri: '/test/root2', name: 'Test Root 2' }
      ];
      cliExecutor.setRoots(testRoots);

      // Execute command with useMcpCwd=true
      await cliExecutor.execute('test-command', ['arg1', 'arg2'], true);

      // Verify that the primary root was used
      expect(mockRun).toHaveBeenCalledWith(
        'test-command',
        ['arg1', 'arg2'],
        '/test/root1',
        undefined // stdinInput
      );
    });

    test('should use custom working directory when provided', async () => {
      // Set up roots
      const testRoots = [
        { uri: '/test/root1', name: 'Test Root 1' }
      ];
      cliExecutor.setRoots(testRoots);

      // Execute command with custom working directory
      await cliExecutor.execute('test-command', ['arg1'], true, '/custom/dir');

      // Verify that the custom directory was used instead of root
      expect(mockRun).toHaveBeenCalledWith(
        'test-command',
        ['arg1'],
        '/custom/dir',
        undefined // stdinInput
      );
    });

    test('should fall back to project root when no roots are set', async () => {
      // Execute command with useMcpCwd=true but no roots set
      await cliExecutor.execute('test-command', ['arg1'], true);

      // Verify that the project root was used as fallback
      expect(mockRun).toHaveBeenCalledWith(
        'test-command',
        ['arg1'],
        '/mock/project/root',
        undefined // stdinInput
      );
    });
  });
  
  describe('CLICmdWriter with Root capability', () => {
    test('should include primary root in command text when useMcpCwd is true', async () => {
      // Set up roots
      const testRoots = [
        { uri: '/test/root1', name: 'Test Root 1' }
      ];
      cliCmdWriter.setRoots(testRoots);
      
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
      cliCmdWriter.setRoots(testRoots);
      
      // Generate command text with custom working directory
      const result = await cliCmdWriter.execute('test-command', ['arg1'], true, '/custom/dir') as CommandResult;
      
      // Verify that the command text includes the custom directory
      expect(result.output).toContain('/custom/dir');
    });
    
    test('should fall back to project root in command text when no roots are set', async () => {
      // Generate command text with useMcpCwd=true but no roots set
      const result = await cliCmdWriter.execute('test-command', ['arg1'], true) as CommandResult;
      
      // Verify that the command text includes the project root
      expect(result.output).toContain('/mock/project/root');
    });
  });
});
