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
    expect(result.output).toContain('ServiceNow SDK v3.0.2');
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
    mockRunner.setMockResult({
      stdout: 'Help for auth command',
      stderr: '',
      exitCode: 0
    });

    const result = await helpCommand.execute({ command: 'auth' });
    expect(result.success).toBe(true);
  });

  test('DebugCommand should execute correctly', async () => {
    const debugCommand = commands.find((cmd) => cmd.name === 'enable_fluent_debug');
    expect(debugCommand).toBeDefined();

    const result = await debugCommand.execute({ command: 'version' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('Debug logs');
  });

  test('UpgradeCommand should execute correctly with basic upgrade', async () => {
    const upgradeCommand = commands.find((cmd) => cmd.name === 'upgrade_fluent');
    expect(upgradeCommand).toBeDefined();

    const result = await upgradeCommand.execute({});
    expect(result.success).toBe(true);
    expect(result.output).toContain('upgraded to latest version');
  });

  test('UpgradeCommand should execute correctly with check option', async () => {
    const upgradeCommand = commands.find((cmd) => cmd.name === 'upgrade_fluent');

    const result = await upgradeCommand.execute({ check: true });
    expect(result.success).toBe(true);
    expect(result.output).toContain('up to date');
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
