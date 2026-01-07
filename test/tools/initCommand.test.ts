import { CommandProcessor, CommandResult } from "../../src/utils/types.js";
import { InitCommand } from "../../src/tools/commands/initCommand.js";
import { FluentAppValidator } from "../../src/utils/fluentAppValidator.js";
import { SessionManager } from "../../src/utils/sessionManager.js";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

  exists(path: string): boolean {
    return this.existingDirs.has(path);
  }

  isDirectory(path: string): boolean {
    return this.existingDirs.has(path);
  }

  readdir(path: string): string[] {
    if (path === '/dir-with-package') {
      return ['package.json'];
    }
    if (path === '/dir-with-config') {
      return ['now.config.json'];
    }
    return [];
  }
}

const mockFs = new VirtualFileSystem();

jest.mock("../../src/utils/sessionManager.js", () => {
  return {
    SessionManager: {
      getInstance: jest.fn().mockReturnValue({
        setWorkingDirectory: jest.fn(),
        getWorkingDirectory: jest.fn().mockReturnValue("/saved-working-dir"),
        getAuthAlias: jest.fn().mockReturnValue(undefined),
        setAuthAlias: jest.fn(),
        getAuthValidationResult: jest.fn().mockReturnValue(undefined),
        setAuthValidationResult: jest.fn(),
      }),
    },
  };
});

describe("InitCommand", () => {
  let initCommand: InitCommand;
  let mockExecutor: CommandProcessor;
  let mockMcpServer: Partial<McpServer>;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the virtual filesystem
    mockFs.reset();
    // Setup initial filesystem state
    mockFs.addExistingDirectory('/valid-dir');
    mockFs.markAsFluentApp('/existing-app-dir', 'x_test_scope', 'test-package');
    
    // Mock filesystem functions used by validation
    jest.spyOn(fs, 'existsSync').mockImplementation((path: any) => {
      const pathStr = path.toString();
      return mockFs.exists(pathStr);
    });
    
    jest.spyOn(fs, 'statSync').mockImplementation((path: any) => {
      const pathStr = path.toString();
      if (!mockFs.exists(pathStr)) {
        throw new Error(`ENOENT: no such file or directory, stat '${pathStr}'`);
      }
      return {
        isDirectory: () => mockFs.isDirectory(pathStr),
        isFile: () => !mockFs.isDirectory(pathStr)
      } as any;
    });
    
    jest.spyOn(fs, 'readdirSync').mockImplementation((path: any) => {
      const pathStr = path.toString();
      return mockFs.readdir(pathStr) as any;
    });
    
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
    
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
    
    // Create mock MCP server
    mockMcpServer = {
      server: {
        elicitInput: jest.fn()
      }
    } as any;
    
    initCommand = new InitCommand(mockExecutor, mockMcpServer as McpServer);
  });

  test("should have correct properties", () => {
    expect(initCommand.name).toBe("init_fluent_app");
    expect(initCommand.description).toContain(
      "Initialize a new ServiceNow custom application"
    );
    expect(initCommand.description).toContain("MCP elicitation");
    expect(initCommand.arguments.length).toBeGreaterThan(0);
    
    const intentArg = initCommand.arguments.find(arg => arg.name === "intent");
    expect(intentArg?.required).toBe(false);
    expect(intentArg?.description).toContain("conversion");
    expect(intentArg?.description).toContain("creation");

    const workingDirArg = initCommand.arguments.find(arg => arg.name === "workingDirectory");
    expect(workingDirArg?.required).toBe(true);

    const templateArg = initCommand.arguments.find(arg => arg.name === "template");
    expect(templateArg?.required).toBe(true);

    const appNameArg = initCommand.arguments.find(arg => arg.name === "appName");
    expect(appNameArg?.required).toBe(false);
    expect(appNameArg?.description).toContain("For creation");

    const scopeNameArg = initCommand.arguments.find(arg => arg.name === "scopeName");
    expect(scopeNameArg?.required).toBe(false);
    expect(scopeNameArg?.description).toContain("x_");

    const fromArg = initCommand.arguments.find(arg => arg.name === "from");
    expect(fromArg?.required).toBe(false);
    expect(fromArg?.description).toContain("For conversion");
  });

  test('should use elicitation when no intent can be determined', async () => {
    // Mock MCP server to return intent selection
    (mockMcpServer.server!.elicitInput as jest.Mock).mockResolvedValueOnce({
      action: 'accept',
      content: { intent: 'creation' }
    });

    // Mock second elicitation for creation data
    (mockMcpServer.server!.elicitInput as jest.Mock).mockResolvedValueOnce({
      action: 'accept',
      content: { 
        appName: 'Test App',
        packageName: 'test-app',
        scopeName: 'x_test_scope',
        workingDirectory: '/valid-dir',
        template: 'javascript.react'
      }
    });

    const result = await initCommand.execute({});
    
    expect(mockMcpServer.server!.elicitInput).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  test('should handle elicitation rejection', async () => {
    // Mock MCP server to return rejection
    (mockMcpServer.server!.elicitInput as jest.Mock).mockResolvedValueOnce({
      action: 'reject',
      content: null
    });

    const result = await initCommand.execute({});
    
    expect(mockMcpServer.server!.elicitInput).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Intent selection is required');
  });

  test('should use elicitation for conversion flow', async () => {
    // Mock MCP server to return intent selection
    (mockMcpServer.server!.elicitInput as jest.Mock).mockResolvedValueOnce({
      action: 'accept',
      content: { intent: 'conversion' }
    });

    // Mock second elicitation for conversion data
    (mockMcpServer.server!.elicitInput as jest.Mock).mockResolvedValueOnce({
      action: 'accept',
      content: { 
        from: 'a1b2c3d4e5f6789012345678901234ab',
        workingDirectory: '/valid-dir',
        auth: 'test-auth'
      }
    });

    const result = await initCommand.execute({});
    
    expect(mockMcpServer.server!.elicitInput).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  test('should create directory if it does not exist', async () => {
    const args = {
      workingDirectory: '/non-existent-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };
    await initCommand.execute(args);
    
    expect(fs.mkdirSync).toHaveBeenCalledWith('/non-existent-dir', { recursive: true });
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/non-existent-dir');
    expect(mockExecutor.process).toHaveBeenCalled();
  });

  test('should handle existing directory with no Fluent app', async () => {
    mockFs.addExistingDirectory('/valid-dir');
    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };
    await initCommand.execute(args);
    
    // Should not create directory
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    // Should save working directory
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/valid-dir');
    // Should execute command
    expect(mockExecutor.process).toHaveBeenCalled();
  });
  
  test('should handle existing directory with Fluent app', async () => {
    mockFs.markAsFluentApp('/existing-app-dir', 'x_test_scope', 'test-package');
    const args = {
      workingDirectory: '/existing-app-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };
    const result = await initCommand.execute(args);
    
    expect(result.success).toBe(true);
    expect(result.output).toContain('already contains');
    expect(result.output).toContain('x_test_scope');
    // Should save working directory
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/existing-app-dir');
    // Should not execute command
    expect(mockExecutor.process).not.toHaveBeenCalled();
  });

  test('should fail when working directory not provided', async () => {
    // Create InitCommand without MCP server to test error handling
    const initCommandNoMcp = new InitCommand(mockExecutor);
    
    const args = {
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };
    
    const result = await initCommandNoMcp.execute(args);
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Required parameters for creation are missing: workingDirectory');
  });

  test('should execute conversion with from parameter', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      from: 'a1b2c3d4e5f6789012345678901234ab', // Valid sys_id
      auth: 'test-auth'
    };

    await initCommand.execute(args);
    
    expect(mockExecutor.process).toHaveBeenCalledWith(
      'npx',
      [
        '-y',
        '@servicenow/sdk', 
        'init', 
        '--from', 'a1b2c3d4e5f6789012345678901234ab',
        '--auth', 'test-auth'
      ],
      false,
      '/valid-dir'
    );
    
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/valid-dir');
  });

  test('should execute creation with all required parameters', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'typescript.react',
      auth: 'test-auth'
    };

    await initCommand.execute(args);
    
    expect(mockExecutor.process).toHaveBeenCalledWith(
      'npx',
      [
        '-y',
        '@servicenow/sdk', 
        'init', 
        '--appName', '"Test App"',
        '--packageName', 'test-app',
        '--scopeName', 'x_test_scope',
        '--template', 'typescript.react',
        '--auth', 'test-auth'
      ],
      false,
      '/valid-dir'
    );
    
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/valid-dir');
  });

  test('should use elicitation when conversion missing required parameters', async () => {
    // Mock MCP server to return conversion data
    (mockMcpServer.server!.elicitInput as jest.Mock).mockResolvedValueOnce({
      action: 'accept',
      content: { 
        from: 'a1b2c3d4e5f6789012345678901234ab',
        workingDirectory: '/valid-dir',
        auth: 'test-auth'
      }
    });

    const args = { intent: 'conversion' };
    const result = await initCommand.execute(args);
    
    expect(mockMcpServer.server!.elicitInput).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  test('should use elicitation when creation missing required parameters', async () => {
    // Mock MCP server to return creation data
    (mockMcpServer.server!.elicitInput as jest.Mock).mockResolvedValueOnce({
      action: 'accept',
      content: { 
        appName: 'Test App',
        packageName: 'test-app',
        scopeName: 'x_test_scope',
        workingDirectory: '/valid-dir',
        template: 'javascript.react'
      }
    });

    const args = { intent: 'creation' };
    const result = await initCommand.execute(args);
    
    expect(mockMcpServer.server!.elicitInput).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });


  test('should validate sys_id format for conversion', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      from: 'invalid-sys-id'
    };

    const result = await initCommand.execute(args);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('sys_id must be a 32-character hexadecimal string');
  });

  test('should validate scopeName format for creation', async () => {
    mockFs.addExistingDirectory('/valid-dir');
    
    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'invalid_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('scopeName must start with "x_" prefix');
  });

  test('should validate local path for conversion', async () => {
    mockFs.markAsFluentApp('/existing-path', 'x_existing_scope', 'existing-package');
    const args = {
      workingDirectory: '/valid-dir',
      from: '/existing-path'
    };

    await initCommand.execute(args);
    expect(mockExecutor.process).toHaveBeenCalled();
  });

  test('should fail validation for non-existent local path', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      from: '/non-existent-path'
    };

    const result = await initCommand.execute(args);
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Local path does not exist');
  });

  test('should create working directory if it does not exist', async () => {
    const args = {
      workingDirectory: '/non-existent-working-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);
    
    expect(result.success).toBe(true);
    expect(fs.mkdirSync).toHaveBeenCalledWith('/non-existent-working-dir', { recursive: true });
  });

  test('should validate working directory is empty (no package.json)', async () => {
    // Mock fs.readdirSync to return package.json
    const mockReaddirSync = jest.spyOn(fs, 'readdirSync').mockImplementation((path: any) => {
      if (path === '/dir-with-package') {
        return ['package.json'] as any;
      }
      return [] as any;
    });

    mockFs.addExistingDirectory('/dir-with-package');

    const args = {
      workingDirectory: '/dir-with-package',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);
    
    // Restore original function
    mockReaddirSync.mockRestore();
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Working directory must not contain package.json');
  });

  test('should validate working directory is empty (no now.config.json)', async () => {
    // Mock fs.readdirSync to return now.config.json
    const mockReaddirSync = jest.spyOn(fs, 'readdirSync').mockImplementation((path: any) => {
      if (path === '/dir-with-config') {
        return ['now.config.json'] as any;
      }
      return [] as any;
    });

    mockFs.addExistingDirectory('/dir-with-config');

    const args = {
      workingDirectory: '/dir-with-config',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);
    
    // Restore original function
    mockReaddirSync.mockRestore();
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Working directory must not contain now.config.json');
  });

  test('should validate template parameter', async () => {
    mockFs.addExistingDirectory('/valid-dir');
    
    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'invalid-template'
    };

    const result = await initCommand.execute(args);
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('template must be one of:');
  });

  test('should determine intent from from parameter', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      from: 'a1b2c3d4e5f6789012345678901234ab'
    };

    await initCommand.execute(args);
    
    // Should execute conversion flow
    expect(mockExecutor.process).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['--from', 'a1b2c3d4e5f6789012345678901234ab']),
      false,
      '/valid-dir'
    );
  });

  test('should determine intent from creation parameters', async () => {
    const args = {
      workingDirectory: '/valid-dir',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    await initCommand.execute(args);
    
    // Should execute creation flow
    expect(mockExecutor.process).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['--appName', '"Test App"']),
      false,
      '/valid-dir'
    );
  });
});
