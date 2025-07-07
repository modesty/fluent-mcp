import { CommandProcessor, CommandResult } from "../../src/utils/types.js";
import { InitCommand } from "../../src/tools/commands/initCommand.js";
import { FluentAppValidator } from "../../src/utils/fluentAppValidator.js";
import { SessionManager } from "../../src/utils/sessionManager.js";
import fs from "node:fs";
import os from "node:os";

// Create a virtual filesystem helper
interface FluentAppInfo {
  hasApp: boolean;
  scopeName?: string;
  packageName?: string;
}

class VirtualFileSystem {
  private existingDirs: Set<string> = new Set<string>();
  private fluentApps: Map<string, FluentAppInfo> = new Map();

  reset(): void {
    this.existingDirs.clear();
    this.fluentApps.clear();
  }

  addExistingDirectory(path: string): void {
    this.existingDirs.add(path);
  }

  markAsFluentApp(path: string, scopeName: string, packageName: string): void {
    this.addExistingDirectory(path);
    this.fluentApps.set(path, {
      hasApp: true,
      scopeName,
      packageName
    });
  }

  directoryExists(path: string): boolean {
    return this.existingDirs.has(path);
  }

  createDirectory(path: string): void {
    this.existingDirs.add(path);
  }

  getFluentAppInfo(path: string): FluentAppInfo {
    return this.fluentApps.get(path) || { hasApp: false };
  }
}

const mockFs = new VirtualFileSystem();

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
  let mockExecutor: CommandProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the virtual filesystem
    mockFs.reset();
    // Setup initial filesystem state
    mockFs.addExistingDirectory('/valid-dir');
    mockFs.markAsFluentApp('/existing-app-dir', 'x_test_scope', 'test-package');
    
    // Create a mock processor
    mockExecutor = {
      process: jest.fn().mockImplementation((command, args, useMcpCwd, workingDir) => {
        // Default mock implementation for successful execution
        return Promise.resolve({
          success: true,
          output: "Mock init command executed successfully",
          exitCode: 0,
        } as CommandResult);
      }),
      execute: jest.fn().mockImplementation((command, args, useMcpCwd, workingDir) => {
        // Default mock implementation for successful execution
        return Promise.resolve({
          success: true,
          output: "Mock init command executed successfully",
          exitCode: 0,
        } as CommandResult);
      }),
    } as CommandProcessor;

    // Mock file system - must be done BEFORE creating the command
    jest.spyOn(fs, 'existsSync').mockImplementation((path) => {
      return mockFs.directoryExists(String(path));
    });
    
    jest.spyOn(fs, 'mkdirSync').mockImplementation((path) => {
      mockFs.createDirectory(String(path));
      return undefined;
    });
    
    // Mock os.homedir
    jest.spyOn(os, 'homedir').mockReturnValue('/mock-home');
    
    // Mock FluentAppValidator
    jest.spyOn(FluentAppValidator, 'checkFluentAppExists').mockImplementation(async (directory) => {
      const info = mockFs.getFluentAppInfo(directory);
      if (info.hasApp) {
        return { 
          hasApp: true, 
          scopeName: info.scopeName, 
          packageName: info.packageName 
        };
      }
      return { hasApp: false };
    });
    
    initCommand = new InitCommand(mockExecutor);
  });

  test("should have correct properties", () => {
    expect(initCommand.name).toBe("prepare_fluent_init");
    expect(initCommand.description).toContain(
      "a Fluent (ServiceNow SDK) application: If specified directory has no Fluent (ServiceNow SDK) application, it will create a new one. If it has a Fluent (ServiceNow SDK) application, it will save the directory as the working directory for future commands, including build, install, transform and dependencies."
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
    expect(mockExecutor.process).toHaveBeenCalled();
  });

  test('should handle existing directory with no Fluent app', async () => {
    mockFs.addExistingDirectory('/valid-dir');
    await initCommand.execute({ workingDirectory: '/valid-dir' });
    
    // Should not create directory
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    // Should save working directory
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/valid-dir');
    // Should execute command
    expect(mockExecutor.process).toHaveBeenCalled();
  });
  
  test('should handle existing directory with Fluent app', async () => {
    mockFs.markAsFluentApp('/existing-app-dir', 'x_test_scope', 'test-package');
    const result = await initCommand.execute({ workingDirectory: '/existing-app-dir' });
    
    expect(result.success).toBe(true);  // Changed to true since we're returning success now
    expect(result.output).toContain('already contains');
    expect(result.output).toContain('x_test_scope');
    // Should save working directory
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/existing-app-dir');
    // Should not execute command
    expect(mockExecutor.process).not.toHaveBeenCalled();
  });

  test('should create default directory if working directory not provided', async () => {
    // Mock the Date object for consistent test results
    const mockDate = new Date('2025-06-14T12:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    
    await initCommand.execute({});
    
    const expectedDir = '/mock-home/fluent-app-2025-06-14T12-00-00-000Z';
    expect(fs.mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith(expectedDir);
    expect(mockExecutor.process).toHaveBeenCalled();
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
    
    expect(mockExecutor.process).toHaveBeenCalledWith(
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
