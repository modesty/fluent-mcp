import { CommandResult } from "../../src/utils/types.js";
import { CLIExecutor } from "../../src/tools/cliCommandTools.js";
import { InitCommand } from "../../src/tools/commands/initCommand.js";
import { FluentAppValidator } from "../../src/utils/fluentAppValidator.js";
import { SessionManager } from "../../src/utils/sessionManager.js";
import fs from "node:fs";
import os from "node:os";

jest.mock("../../src/utils/sessionManager.js", () => {
  return {
    SessionManager: {
      getInstance: jest.fn().mockReturnValue({
        setWorkingDirectory: jest.fn(),
        getWorkingDirectory: jest.fn().mockReturnValue("/saved-working-dir"),
      }),
    },
  };
});

describe("InitCommand", () => {
  let initCommand: InitCommand;
  let mockExecutor: CLIExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock executor
    mockExecutor = {
      execute: jest.fn().mockImplementation((command, args, useMcpCwd, workingDir) => {
        // Default mock implementation for successful execution
        return Promise.resolve({
          success: true,
          output: "Mock init command executed successfully",
          exitCode: 0,
        } as CommandResult);
      }),
    } as unknown as CLIExecutor;

    // Mock file system - must be done BEFORE creating the command
    jest.spyOn(fs, 'existsSync').mockImplementation((path) => {
      if (String(path) === '/valid-dir' || String(path) === '/existing-app-dir') return true;
      return false;
    });
    
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    
    // Mock os.homedir
    jest.spyOn(os, 'homedir').mockReturnValue('/mock-home');
    
    // Mock FluentAppValidator
    jest.spyOn(FluentAppValidator, 'checkFluentAppExists').mockImplementation(async (directory) => {
      if (directory === '/existing-app-dir') {
        return { 
          hasApp: true, 
          scopeName: 'x_test_scope', 
          packageName: 'test-package' 
        };
      }
      return { hasApp: false };
    });
    
    initCommand = new InitCommand(mockExecutor);
  });

  test("should have correct properties", () => {
    expect(initCommand.name).toBe("fluent_init");
    expect(initCommand.description).toBe(
      "Initialize a Fluent (ServiceNow SDK) application: If specified directory has no Fluent (ServiceNow SDK) application, it will create a new one. If it has a Fluent (ServiceNow SDK) application, it will save the directory as the working directory for future commands, including build, install, transform and dependencies."
    );
    expect(initCommand.arguments.length).toBeGreaterThan(0);
    
    const workingDirArg = initCommand.arguments.find(arg => arg.name === "workingDirectory");
    expect(workingDirArg?.required).toBe(false); // Changed to false since workingDirectory is now optional

    const appNameArg = initCommand.arguments.find(arg => arg.name === "appName");
    expect(appNameArg?.required).toBe(true);

    const scopeNameArg = initCommand.arguments.find(arg => arg.name === "scopeName");
    expect(scopeNameArg?.required).toBe(true);

    const packageNameArg = initCommand.arguments.find(arg => arg.name === "packageName");
    expect(packageNameArg?.required).toBe(true);

  });

  test('should create directory if it does not exist', async () => {
    await initCommand.execute({ workingDirectory: '/non-existent-dir' });
    
    expect(fs.mkdirSync).toHaveBeenCalledWith('/non-existent-dir', { recursive: true });
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/non-existent-dir');
    expect(mockExecutor.execute).toHaveBeenCalled();
  });

  test('should handle existing directory with no Fluent app', async () => {
    await initCommand.execute({ workingDirectory: '/valid-dir' });
    
    // Should not create directory
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    // Should save working directory
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/valid-dir');
    // Should execute command
    expect(mockExecutor.execute).toHaveBeenCalled();
  });
  
  test('should handle existing directory with Fluent app', async () => {
    const result = await initCommand.execute({ workingDirectory: '/existing-app-dir' });
    
    expect(result.success).toBe(true);  // Changed to true since we're returning success now
    expect(result.output).toContain('already contains');
    expect(result.output).toContain('x_test_scope');
    // Should save working directory
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/existing-app-dir');
    // Should not execute command
    expect(mockExecutor.execute).not.toHaveBeenCalled();
  });

  test('should create default directory if working directory not provided', async () => {
    // Mock the Date object for consistent test results
    const mockDate = new Date('2025-06-14T12:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    
    await initCommand.execute({});
    
    const expectedDir = '/mock-home/fluent-app-2025-06-14T12-00-00-000Z';
    expect(fs.mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith(expectedDir);
    expect(mockExecutor.execute).toHaveBeenCalled();
  });

  test('should execute init command with correct arguments', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      from: 'template-id',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      auth: 'test-auth'
    };

    await initCommand.execute(args);
    
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      'npx',
      [
        '-y',
        '@servicenow/sdk', 
        'init', 
        '--from', 'template-id',
        '--appName', '"Test App"',
        '--packageName', 'test-app',
        '--scopeName', 'x_test_scope',
        '--auth', 'test-auth'
      ],
      false,
      '/valid-dir'
    );
    
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/valid-dir');
  });
});
