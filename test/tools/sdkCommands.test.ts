// Import cliCommandTools after mocking
import { CommandFactory, CLIExecutor, NodeProcessRunner } from '../../src/tools/cliCommandTools.js';
import { ProcessResult } from '../../src/utils/types.js';

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

  async run(_command: string, args: string[] = []): Promise<ProcessResult> {
    // Return different mocked responses based on args
    if (args.includes('--version')) {
      return {
        stdout: 'ServiceNow SDK v3.0.2',
        stderr: '',
        exitCode: 0
      };
    } else if (args.includes('--help')) {
      return {
        stdout: 'ServiceNow SDK Help information',
        stderr: '',
        exitCode: 0
      };
    } else if (args.includes('--debug')) {
      return {
        stdout: 'Debug logs for ServiceNow SDK',
        stderr: '',
        exitCode: 0
      };
    } else if (args.includes('upgrade')) {
      let output = 'ServiceNow SDK upgraded to latest version';
      if (args.includes('--check')) {
        output = 'ServiceNow SDK is up to date';
      }
      if (args.includes('--debug')) {
        output += '\nDebug information: Upgrade process details';
      }
      return {
        stdout: output,
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
    commands = CommandFactory.createCommands(executor);
  });

  test('VersionCommand should execute correctly', async () => {
    const versionCommand = commands.find((cmd) => cmd.name === 'get_fluent_version');
    expect(versionCommand).toBeDefined();

    const result = await versionCommand.execute({});
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

  test('HelpCommand should execute correctly with no args', async () => {
    const helpCommand = commands.find((cmd) => cmd.name === 'get_fluent_help');
    expect(helpCommand).toBeDefined();

    const result = await helpCommand.execute({});
    expect(result.success).toBe(true);
    expect(result.output).toContain('ServiceNow SDK Help information');
  });

  test('HelpCommand should execute correctly with specific command', async () => {
    const helpCommand = commands.find((cmd) => cmd.name === 'get_fluent_help');
    
    // Set up specific mock response
    const mockStdout = 'Help for auth command';
    const mockStderr = '';
    const mockExitCode = 0;
    
    // Override the run method directly for this test
    const originalRun = mockRunner.run;
    mockRunner.run = jest.fn().mockImplementation(async (_command, args) => {
      // Check if this is the specific auth help command we're testing
      if (args.includes('auth') && args.includes('--help')) {
        return {
          stdout: mockStdout,
          stderr: mockStderr,
          exitCode: mockExitCode
        };
      }
      
      // Otherwise call the original implementation
      return originalRun.call(mockRunner, _command, args);
    });

    // Execute the command
    const result = await helpCommand.execute({ command: 'auth' });
    
    // Verify the command succeeded
    expect(result.success).toBe(true);
    
    // Verify the mock output is correctly returned in the result
    expect(result.output).toContain(mockStdout);
    expect(result.exitCode).toBe(mockExitCode);
    expect(result.error).toBeUndefined();
    
    // Verify the command was called with expected arguments
    expect(mockRunner.run).toHaveBeenCalledWith(
      'npx', 
      expect.arrayContaining(['now-sdk', 'auth', '--help']), 
      expect.any(String)  // The working directory is passed as the third parameter
    );
    
    // Restore the original run method
    mockRunner.run = originalRun;
  });

  test('UpgradeCommand should execute correctly with basic upgrade', async () => {
    const upgradeCommand = commands.find((cmd) => cmd.name === 'upgrade_fluent');
    expect(upgradeCommand).toBeDefined();

    const result = await upgradeCommand.execute({});
    expect(result.success).toBe(true);
    expect(result.output).toContain('upgraded to latest version');
  });


  test('UpgradeCommand should execute correctly with debug option', async () => {
    const upgradeCommand = commands.find((cmd) => cmd.name === 'upgrade_fluent');

    const result = await upgradeCommand.execute({ debug: true });
    expect(result.success).toBe(true);
    expect(result.output).toContain('Debug logs');
  });

  test('Command should handle errors correctly', async () => {
    const versionCommand = commands.find((cmd) => cmd.name === 'get_fluent_version');

    // Override the run method directly for this specific test
    mockRunner.run = async () => {
      return {
        stdout: '',
        stderr: 'Command not found',
        exitCode: 1
      };
    };

    const result = await versionCommand.execute({});
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBeDefined();
  });
});
