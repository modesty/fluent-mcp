// Import cliCommandTools after mocking
import { CommandFactory, CLIExecutor, NodeProcessRunner } from '../../src/tools/cliCommandTools.js';
import { CommandProcessor, ProcessResult } from '../../src/utils/types.js';

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
      return {
        stdout: 'ServiceNow SDK v3.0.2',
        stderr: '',
        exitCode: 0
      };
    } else if (args.includes('--help') || args.includes('-h')) {
      return {
        stdout: 'ServiceNow SDK Help information',
        stderr: '',
        exitCode: 0
      };
    } else if (args.includes('--debug') || args.includes('-d')) {
      return {
        stdout: 'Debug logs for ServiceNow SDK',
        stderr: '',
        exitCode: 0
      };
    }

    return this.mockResult;
  }
}

describe('SDK Command Tools', () => {
  let mockRunner: MockProcessRunner;
  let executor: CLIExecutor;
  let commands: any[];

  beforeEach(() => {
    mockRunner = new MockProcessRunner();
    executor = new CLIExecutor(mockRunner);
    commands = CommandFactory.createCommands(executor, executor);
  });

  test('SdkInfoCommand should execute correctly with -v flag', async () => {
    const sdkInfoCommand = commands.find((cmd) => cmd.name === 'sdk_info');
    expect(sdkInfoCommand).toBeDefined();

    const result = await sdkInfoCommand.execute({ flag: '-v' });
    expect(result.success).toBe(true);

    // Basic presence check
    expect(result.output).toContain('ServiceNow SDK v');

    // Extract version using regex and validate semantic versioning format
    const versionRegex = /ServiceNow SDK v(\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)/;
    const match = result.output.match(versionRegex);

    // Verify version string was found and extracted
    expect(match).not.toBeNull();
    expect(match).toBeDefined();

    // Extract the version without the prefix
    const versionString = match ? match[1] : '';

    // Validate the format of the extracted version using semantic versioning regex
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    expect(versionString).toMatch(semverRegex);

    // Validate version components are valid numbers
    const versionParts = versionString.split('.');
    expect(Number(versionParts[0])).toBeGreaterThanOrEqual(0); // Major
    expect(Number(versionParts[1])).toBeGreaterThanOrEqual(0); // Minor

    // For patch, we need to handle potential pre-release/build metadata
    const patchPart = versionParts[2].split(/[-+]/)[0]; // Extract patch number before any pre-release/build metadata
    expect(Number(patchPart)).toBeGreaterThanOrEqual(0); // Patch
  });

  test('SdkInfoCommand should execute correctly with -h flag (general help)', async () => {
    const sdkInfoCommand = commands.find((cmd) => cmd.name === 'sdk_info');
    expect(sdkInfoCommand).toBeDefined();

    const result = await sdkInfoCommand.execute({ flag: '-h' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('ServiceNow SDK Help information');
  });

  test('SdkInfoCommand should execute correctly with -h flag and specific command', async () => {
    const sdkInfoCommand = commands.find((cmd) => cmd.name === 'sdk_info');
    expect(sdkInfoCommand).toBeDefined();

    // Set up specific mock response
    const mockOutput = 'Help for auth command';
    const mockExitCode = 0;

    // Override the run method directly for this test
    const originalRun = mockRunner.run;
    mockRunner.run = jest.fn().mockImplementation(async (_command, args) => {
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

    // Execute the command
    const result = await sdkInfoCommand.execute({ flag: '-h', command: 'auth' });

    // Verify the command succeeded
    expect(result.success).toBe(true);

    // Verify the mock output is correctly returned in the result
    expect(result.output).toContain(mockOutput);
    expect(result.exitCode).toBe(mockExitCode);
    expect(result.error).toBeUndefined();

    // Verify the command was called with expected arguments
    expect(mockRunner.run).toHaveBeenCalledWith(
      'npx',  // Should use npx
      expect.arrayContaining(['now-sdk', 'auth', '--help']),  // Args with 'now-sdk' prefix
      expect.any(String),  // Working directory should be provided (project root path)
      undefined  // stdinInput
    );
    
    // Restore the original run method
    mockRunner.run = originalRun;
  });

  test('SdkInfoCommand should execute correctly with -d flag', async () => {
    const sdkInfoCommand = commands.find((cmd) => cmd.name === 'sdk_info');
    expect(sdkInfoCommand).toBeDefined();

    // Set up mock response for debug flag
    const originalRun = mockRunner.run;
    mockRunner.run = jest.fn().mockImplementation(async (_command, args) => {
      if (args.includes('--debug')) {
        return {
          stdout: 'Debug logs for ServiceNow SDK',
          stderr: '',
          exitCode: 0
        };
      }
      return originalRun.call(mockRunner, _command, args);
    });

    const result = await sdkInfoCommand.execute({ flag: '-d' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('Debug logs for ServiceNow SDK');

    // Restore the original run method
    mockRunner.run = originalRun;
  });

  test('SdkInfoCommand should handle invalid flags', async () => {
    const sdkInfoCommand = commands.find((cmd) => cmd.name === 'sdk_info');
    expect(sdkInfoCommand).toBeDefined();

    const result = await sdkInfoCommand.execute({ flag: '--invalid' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Invalid flag');
  });

  test('SdkInfoCommand should handle missing required flag parameter', async () => {
    const sdkInfoCommand = commands.find((cmd) => cmd.name === 'sdk_info');
    expect(sdkInfoCommand).toBeDefined();

    await expect(sdkInfoCommand.execute({})).rejects.toThrow('Required argument \'flag\' is missing');
  });

  test('SdkInfoCommand should handle errors correctly', async () => {
    const sdkInfoCommand = commands.find((cmd) => cmd.name === 'sdk_info');
    expect(sdkInfoCommand).toBeDefined();

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
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBeDefined();

    // Restore the original run method
    mockRunner.run = originalRun;
  });
});
