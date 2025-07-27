import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

import {
  CLICommand,
  CommandProcessor,
  CommandResult,
  ProcessResult,
  ProcessRunner,
} from '../utils/types.js';
import { getProjectRootPath } from '../config.js';
import {
  VersionCommand,
  HelpCommand,
  // UpgradeCommand, // Commented out as it's not used
  AuthCommand,
  InitCommand,
  BuildCommand,
  InstallCommand,
  TransformCommand,
  DependenciesCommand,
} from './commands/index.js';
import logger from '../utils/logger.js';

// Infrastructure Layer
export class NodeProcessRunner implements ProcessRunner {
  async run(
    command: string,
    args: string[] = [],
    cwd?: string
  ): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const env = { ...process.env }; // ensure full environment inheritance
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const { signal } = controller;
      // Set timeout to automatically abort if process hangs
      const timeoutId = setTimeout(() => {
        controller.abort();
        logger.warn(`Command execution timed out after 12000ms: ${command} ${args.join(' ')}`);
      }, 12000); // 12 seconds timeout

      const options: SpawnOptionsWithoutStdio = {
        stdio: 'pipe',
        shell: true,
        cwd, env, signal
      };
      logger.info(`Spawning child process: ${command} ${args.join(' ')}`, { cwd });

      let child;
      try {
        child = child = spawn(command, args, options);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
        return;
      }

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        // Log real-time output for debugging
        logger.info(`[STDOUT] ${text.trim()}`);
      });

      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        // Log real-time errors for debugging
        logger.info(`[STDERR] ${text.trim()}`);
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        logger.info(`Process exited with code ${code}: ${command} ${args.join(' ')}`);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      child.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        logger.error(`Process error: ${error.message}`);
        reject(error);
      });

      // Handle aborted processes
      signal.addEventListener('abort', () => {
        if (child && !child.killed) {
          // Force kill the process that's hanging
          child.kill('SIGKILL');
          reject(new Error(`Process killed after timeout (12000ms): ${command} ${args.join(' ')}`));
        }
      });

    });
  }
}

// Application Layer
export class CLIExecutor implements CommandProcessor {
  private mcpCwd: string | undefined;

  constructor(private processRunner: ProcessRunner) {}

  /**
   * Gets the MCP root directory path (calculated once and cached)
   * @returns The absolute path to the MCP root directory
   */
  private getMcpCwd(): string {
    if (!this.mcpCwd) {
      // Use the utility function that returns the project root path
      this.mcpCwd = getProjectRootPath();
    }

    return this.mcpCwd;
  }

  /**
   * Process a command by executing it and returning the result
   * Implements the CommandProcessor interface
   */
  async process(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string
  ): Promise<CommandResult> {
    return this.execute(command, args, useMcpCwd, customWorkingDir);
  }

  async execute(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string
  ): Promise<CommandResult> {
    try {
      let cwd = customWorkingDir;
      if (!cwd && useMcpCwd) {
        cwd = this.getMcpCwd();
      }
      
      // Sanity check on working directory - warn if it's the system root
      if (cwd === '/' || cwd === '\\') {
        throw new Error('ERROR: Command should never be executed with system root (/) as working directory');
      }

      // Better logging with clear working directory information
      logger.info(`Executing command: ${command} ${args.join(' ')}`, { cwd });
            
      const result = await this.processRunner.run(command, args, cwd);

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr ? new Error(result.stderr) : undefined,
        exitCode: result.exitCode,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error : new Error(String(error)),
        exitCode: 1,
      };
    }
  }
}

// Command Writer - generates command text instead of executing
export class CLICmdWriter implements CommandProcessor {
  private mcpCwd: string | undefined;

  constructor() {}

  /**
   * Gets the MCP root directory path (calculated once and cached)
   * @returns The absolute path to the MCP root directory
   */
  private getMcpCwd(): string {
    if (!this.mcpCwd) {
      // Use the utility function that returns the project root path
      this.mcpCwd = getProjectRootPath();
    }

    return this.mcpCwd;
  }

  /**
   * Process a command by generating its text representation without executing it
   * Implements the CommandProcessor interface
   */
  async process(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string
  ): Promise<CommandResult> {
    return this.execute(command, args, useMcpCwd, customWorkingDir);
  }

  /**
   * For compatibility with the CLIExecutor interface - allows this class
   * to be used as a drop-in replacement in tests and existing code
   */
  async execute(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string
  ): Promise<CommandResult> {
    return this.getCommandText(command, args, useMcpCwd, customWorkingDir);
  }

  /**
   * Returns the text representation of a CLI command without executing it
   * @param command The command to generate
   * @param args Array of command arguments
   * @param useMcpCwd Whether to include the MCP working directory in the command text
   * @param customWorkingDir Custom working directory to use instead of MCP directory
   * @returns CommandResult with the command text in the output field
   */
  private getCommandText(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string
  ): CommandResult {
    try {
      let cwd = customWorkingDir;
      if (!cwd && useMcpCwd) {
        cwd = this.getMcpCwd();
      }
      
      // Sanity check on working directory - warn if it's the system root
      if (cwd === '/' || cwd === '\\') {
        throw new Error('ERROR: Command should never use system root (/) as working directory');
      }

      // Format the command string
      const argsText = args.join(' ');
      const commandText = `${command} ${argsText}`;
      
      // Add working directory context if available
      const cwdInfo = cwd ? `(in directory: ${cwd})` : '';
      const fullCommandText = cwdInfo ? `${commandText} ${cwdInfo}` : commandText;
      
      logger.info(`Generated command text: ${fullCommandText}`);
            
      return {
        success: true,
        output: fullCommandText,
        error: undefined,
        exitCode: 0,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error : new Error(String(error)),
        exitCode: 1,
      };
    }
  }
}

// Domain Layer - Base Command has been moved to ./commands/baseCommand.ts

// Application Services
export class CommandRegistry {
  private commands: Map<string, CLICommand> = new Map();

  register(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  // Convert to MCP Tool format
  toMCPTools(): Tool[] {
    return this.getAllCommands().map((command) => {      
      const tool: Tool = {
        name: command.name,
        description: command.description,
        ...(command.annotations && { annotations: command.annotations }),
        ...(command._meta && { _meta: command._meta }),
        inputSchema: {
          type: 'object',
          properties: command.arguments.reduce(
            (props, arg) => {
              props[arg.name] = {
                type: arg.type === 'array' ? 'array' : arg.type,
                description: arg.description,
              };
              return props;
            },
            {} as Record<string, { type: string; description: string }>
          ),
          required: command.arguments
            .filter((arg) => arg.required)
            .map((arg) => arg.name),
        }
      };
      
      // Add annotations if they exist
      if (command.annotations) {
        // MCP SDK expects annotations to be a direct object with properties
        tool.annotations = {
          title: command.annotations.title,
          readOnlyHint: command.annotations.readOnlyHint,
          destructiveHint: command.annotations.destructiveHint,
          idempotentHint: command.annotations.idempotentHint,
          openWorldHint: command.annotations.openWorldHint
        };
      }
      
      return tool;
    });
  }
}

// Concrete Commands have been moved to individual files in ./commands/ directory

// Factory Pattern for Command Creation
export class CommandFactory {
  /**
   * Creates all CLI command instances with appropriate processors
   * @param executor The command processor to use for most commands that require execution
   * @param writer The command processor to use for commands that should return text (AuthCommand, InitCommand)
   * @returns An array of command instances
   */
  static createCommands(executor: CommandProcessor, writer?: CommandProcessor): CLICommand[] {
    // If no writer is provided, use the executor for all commands
    const textProcessor = writer || executor;
    
    return [
      new VersionCommand(executor),
      new HelpCommand(executor),
      // new UpgradeCommand(executor), // disable for now, it for globally installed now-sdk
      new AuthCommand(textProcessor), // Uses writer to generate text instead of executing
      new InitCommand(textProcessor), // Uses writer to generate text instead of executing
      new BuildCommand(executor),
      new InstallCommand(executor),
      new TransformCommand(executor),
      new DependenciesCommand(textProcessor), // Uses writer to generate text instead of executing
    ];
  }
}
