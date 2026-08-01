import { CommandProcessor, CommandResult } from "../../src/utils/types.js";
import { InitCommand } from "../../src/tools/commands/initCommand.js";
import { FluentAppValidator } from "../../src/utils/fluentAppValidator.js";
import { SessionManager } from "../../src/utils/sessionManager.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

jest.mock("../../src/utils/sessionManager.js", () => require('../mocks/index.js').createSessionManagerMock());

describe("InitCommand", () => {
  let initCommand: InitCommand;
  let mockExecutor: CommandProcessor;

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
    
    initCommand = new InitCommand(mockExecutor);
  });

  test("should have correct properties", () => {
    expect(initCommand.name).toBe("init_fluent_app");
    expect(initCommand.description).toContain(
      "Initialize a new Fluent"
    );
    expect(initCommand.description).toContain("convert");
    expect(initCommand.arguments.length).toBeGreaterThan(0);
    
    const intentArg = initCommand.arguments.find(arg => arg.name === "intent");
    expect(intentArg?.required).toBe(false);
    expect(intentArg?.description).toContain("conversion");
    expect(intentArg?.description).toContain("creation");

    const workingDirArg = initCommand.arguments.find(arg => arg.name === "workingDirectory");
    expect(workingDirArg?.required).toBe(true);

    const templateArg = initCommand.arguments.find(arg => arg.name === "template");
    expect(templateArg?.required).toBe(false); // Only required for creation intent, not globally
    expect(templateArg?.description).toContain("For creation only");

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

  // MCP 2026-07-28 (SEP-2322) removed server-initiated requests, so the tool no
  // longer asks the client for missing values. Every argument must arrive with
  // the tools/call, and an incomplete bag must fail with an actionable message
  // rather than hang on a round trip that is no longer legal.
  test('should fail with an actionable error when no intent can be determined', async () => {
    const result = await initCommand.execute({});

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Cannot determine intent for init_fluent_app');
    // Names both modes and their required arguments
    expect(result.error?.message).toContain("intent to 'creation'");
    expect(result.error?.message).toContain("intent to 'conversion'");
    expect(result.error?.message).toContain('appName');
    expect(result.error?.message).toContain('from');
    // Never reaches the SDK
    expect(mockExecutor.process).not.toHaveBeenCalled();
  });

  test('should never issue a server-initiated request for missing input', async () => {
    // Guards the regression the 2026-07-28 migration removed: no code path may
    // reach back to the client. A bare intent with no data must fail locally.
    const result = await initCommand.execute({ intent: 'creation' });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Required parameters for creation are missing');
    expect(mockExecutor.process).not.toHaveBeenCalled();
  });

  test('should fail with an actionable error when conversion is missing from', async () => {
    const result = await initCommand.execute({
      intent: 'conversion',
      workingDirectory: '/valid-dir',
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Required parameters for conversion are missing: from');
    expect(mockExecutor.process).not.toHaveBeenCalled();
  });

  test('should treat null and blank arguments as absent when reporting missing input', async () => {
    // MCP clients commonly serialize an omitted optional value as null.
    const result = await initCommand.execute({
      intent: 'creation',
      appName: 'Test App',
      packageName: null,
      scopeName: '   ',
      workingDirectory: '/valid-dir',
      template: 'javascript.react',
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Required parameters for creation are missing');
    expect(result.error?.message).toContain('packageName');
    expect(result.error?.message).toContain('scopeName');
    expect(result.error?.message).not.toContain('appName');
  });

  test('should list the valid templates when creation input is incomplete', async () => {
    const result = await initCommand.execute({ intent: 'creation', appName: 'Test App' });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('typescript.vue');
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
    const args = {
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      template: 'javascript.react'
    };

    const result = await initCommand.execute(args);

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
      process.execPath,
      [
        '/test/node_modules/@servicenow/sdk/bin/index.js',
        'init', 
        '--from', 'a1b2c3d4e5f6789012345678901234ab',
        '--auth', 'test-auth'
      ],
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
    
    // SDK v4.5.0: init no longer injects --auth for creation (only for conversion)
    expect(mockExecutor.process).toHaveBeenCalledWith(
      process.execPath,
      [
        '/test/node_modules/@servicenow/sdk/bin/index.js',
        'init',
        '--appName', '"Test App"',
        '--packageName', 'test-app',
        '--scopeName', 'x_test_scope',
        '--template', 'typescript.react',
      ],
      '/valid-dir'
    );
    
    expect(SessionManager.getInstance().setWorkingDirectory).toHaveBeenCalledWith('/valid-dir');
  });

  test('should succeed for an explicit conversion intent with complete arguments', async () => {
    const result = await initCommand.execute({
      intent: 'conversion',
      from: 'a1b2c3d4e5f6789012345678901234ab',
      workingDirectory: '/valid-dir',
      auth: 'test-auth',
    });

    expect(result.success).toBe(true);
    expect(mockExecutor.process).toHaveBeenCalled();
  });

  test('should succeed for an explicit creation intent with complete arguments', async () => {
    const result = await initCommand.execute({
      intent: 'creation',
      appName: 'Test App',
      packageName: 'test-app',
      scopeName: 'x_test_scope',
      workingDirectory: '/valid-dir',
      template: 'javascript.react',
    });

    expect(result.success).toBe(true);
    expect(mockExecutor.process).toHaveBeenCalled();
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
    const ensureAuthValidated = jest.fn().mockResolvedValue(undefined);
    const localConversionCommand = new InitCommand(mockExecutor, ensureAuthValidated);
    const args = {
      workingDirectory: '/valid-dir',
      from: '/existing-path'
    };

    await localConversionCommand.execute(args);
    expect(mockExecutor.process).toHaveBeenCalled();
    expect(ensureAuthValidated).not.toHaveBeenCalled();
    expect(mockExecutor.process).toHaveBeenCalledWith(
      process.execPath,
      expect.not.arrayContaining(['--auth']),
      '/valid-dir'
    );
  });

  test('should recognize a bare relative local path without triggering auth validation', async () => {
    mockFs.markAsFluentApp(path.resolve('existing-path'), 'x_existing_scope', 'existing-package');
    const ensureAuthValidated = jest.fn().mockResolvedValue(undefined);
    const localConversionCommand = new InitCommand(mockExecutor, ensureAuthValidated);

    await localConversionCommand.execute({
      workingDirectory: '/valid-dir',
      from: 'existing-path',
    });

    expect(ensureAuthValidated).not.toHaveBeenCalled();
    expect(mockExecutor.process).toHaveBeenCalledWith(
      process.execPath,
      expect.not.arrayContaining(['--auth']),
      '/valid-dir'
    );
  });

  test('should honor an explicit auth alias for a local conversion without lazy validation', async () => {
    mockFs.markAsFluentApp('/existing-path', 'x_existing_scope', 'existing-package');
    const ensureAuthValidated = jest.fn().mockResolvedValue(undefined);
    const localConversionCommand = new InitCommand(mockExecutor, ensureAuthValidated);

    await localConversionCommand.execute({
      workingDirectory: '/valid-dir',
      from: '/existing-path',
      auth: 'explicit-local-auth',
    });

    expect(ensureAuthValidated).not.toHaveBeenCalled();
    expect(mockExecutor.process).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(['--auth', 'explicit-local-auth']),
      '/valid-dir'
    );
  });

  test('should lazily validate auth for sys_id conversion without an alias', async () => {
    const ensureAuthValidated = jest.fn().mockResolvedValue(undefined);
    const instanceConversionCommand = new InitCommand(mockExecutor, ensureAuthValidated);

    await instanceConversionCommand.execute({
      workingDirectory: '/valid-dir',
      from: 'a1b2c3d4e5f6789012345678901234ab'
    });

    expect(ensureAuthValidated).toHaveBeenCalledTimes(1);
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
      process.execPath,
      expect.arrayContaining(['--from', 'a1b2c3d4e5f6789012345678901234ab']),
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
      process.execPath,
      expect.arrayContaining(['--appName', '"Test App"']),
      '/valid-dir'
    );
  });
});
