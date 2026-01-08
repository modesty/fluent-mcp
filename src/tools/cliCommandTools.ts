import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

import {
  CLICommand,
  CommandProcessor,
  CommandResult,
  CommandResultFactory,
  ProcessResult,
  ProcessRunner,
} from '../utils/types.js';
import { resolveWorkingDirectory } from '../utils/rootContext.js';
import {
  SdkInfoCommand,
  InitCommand,
  BuildCommand,
  InstallCommand,
  TransformCommand,
  DependenciesCommand,
  DownloadCommand,
  CleanCommand,
  PackCommand,
} from './commands/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import logger from '../utils/logger.js';

/** Timeout for child process execution in milliseconds */
const PROCESS_TIMEOUT_MS = 12000;

/** Delay before checking for prompts after stdout data (allows buffering) */
const STDIN_PROMPT_CHECK_DELAY_MS = 50;

/** Delay before closing stdin after all input lines written */
const STDIN_CLOSE_DELAY_MS = 200;

// Infrastructure Layer
export class NodeProcessRunner implements ProcessRunner {
  async run(
    command: string,
    args: string[] = [],
    cwd?: string,
    stdinInput?: string
  ): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const env = { ...process.env }; // ensure full environment inheritance
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const { signal } = controller;
      // Set timeout to automatically abort if process hangs
      const timeoutId = setTimeout(() => {
        controller.abort();
        logger.warn(`Command execution timed out after ${PROCESS_TIMEOUT_MS}ms: ${command} ${args.join(' ')}`);
      }, PROCESS_TIMEOUT_MS);

      const options: SpawnOptionsWithoutStdio = {
        stdio: 'pipe',
        shell: true,
        cwd, env, signal
      };
      logger.info(`Spawning child process: ${command} ${args.join(' ')}`, { cwd });

      let child;
      try {
        child = spawn(command, args, options);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
        return;
      }

      // Log if stdin input is provided (actual writing happens in response to prompts)
      if (stdinInput && child.stdin) {
        logger.debug('Stdin input provided, will write in response to detected prompts');
      }

      let stdout = '';
      let stderr = '';

      // For interactive input, track state and detect prompts
      const stdinState = {
        lines: stdinInput?.split('\n').filter(line => line.length > 0) || [],
        lineIndex: 0,
        pendingStdout: '',
        inputComplete: false
      };

      // Function to check for prompts and write next input line
      const writeNextLineIfPrompted = () => {
        if (stdinState.inputComplete || stdinState.lineIndex >= stdinState.lines.length) {
          return;
        }
        if (!child.stdin || child.stdin.destroyed) {
          return;
        }

        // Detect inquirer-style prompts (start with "?") or other input requests
        // Match: "? Question text" - inquirer prompts start with question mark
        const hasPrompt = /\?\s+[^\n]+$/.test(stdinState.pendingStdout);

        if (hasPrompt) {
          const line = stdinState.lines[stdinState.lineIndex];
          logger.debug(`Prompt detected, writing stdin line ${stdinState.lineIndex + 1}/${stdinState.lines.length}`);
          child.stdin.write(line + '\n');
          // Security: Clear the credential line from memory after writing
          stdinState.lines[stdinState.lineIndex] = '';
          stdinState.lineIndex++;
          stdinState.pendingStdout = ''; // Reset to wait for next prompt

          // If all lines written, close stdin after a small delay
          if (stdinState.lineIndex >= stdinState.lines.length) {
            stdinState.inputComplete = true;
            // Security: Clear all stdin lines from memory
            stdinState.lines.length = 0;
            setTimeout(() => {
              if (child.stdin && !child.stdin.destroyed) {
                logger.debug('Closing stdin after writing all lines');
                child.stdin.end();
              }
            }, STDIN_CLOSE_DELAY_MS);
          }
        }
      };

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        // Log real-time output for debugging
        logger.info(`[STDOUT] ${text.trim()}`);

        // Accumulate stdout for prompt detection if we have stdin to write
        if (stdinInput && !stdinState.inputComplete) {
          stdinState.pendingStdout += text;
          // Check for prompts after a tiny delay to allow buffering
          setTimeout(writeNextLineIfPrompted, STDIN_PROMPT_CHECK_DELAY_MS);
        }
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

/**
 * Abstract base class for command processors with shared roots management
 */
export abstract class BaseCommandProcessor implements CommandProcessor {
  protected roots: { uri: string; name?: string }[] = [];

  /**
   * Sets the roots from the MCP server
   * @param roots Array of root URIs and optional names
   */
  setRoots(roots: { uri: string; name?: string }[]): void {
    const hasChanged = this.roots.length !== roots.length ||
      this.roots.some((root, index) =>
        root.uri !== roots[index]?.uri ||
        root.name !== roots[index]?.name
      );

    if (hasChanged) {
      this.roots = [...roots];
      logger.debug(`Updated roots in ${this.constructor.name}`, { roots });
    }
  }

  abstract process(
    command: string,
    args: string[],
    useMcpCwd?: boolean,
    customWorkingDir?: string,
    stdinInput?: string
  ): Promise<CommandResult>;
}

// Application Layer
export class CLIExecutor extends BaseCommandProcessor {
  constructor(private processRunner: ProcessRunner) {
    super();
  }

  /**
   * Process a command by executing it and returning the result
   * Implements the CommandProcessor interface
   */
  async process(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string,
    stdinInput?: string
  ): Promise<CommandResult> {
    return this.execute(command, args, useMcpCwd, customWorkingDir, stdinInput);
  }

  async execute(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string,
    stdinInput?: string
  ): Promise<CommandResult> {
    try {
      let cwd = customWorkingDir;
      if (!cwd && useMcpCwd) {
        // Use canonical working directory resolution
        cwd = resolveWorkingDirectory(this.roots);
      }

      // Sanity check on working directory - warn if it's the system root
      if (cwd === '/' || cwd === '\\') {
        throw new Error('ERROR: Command should never be executed with system root (/) as working directory');
      }

      // Better logging with clear working directory information
      logger.info(`Executing command: ${command} ${args.join(' ')}`, { cwd });

      const result = await this.processRunner.run(command, args, cwd, stdinInput);

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr ? new Error(result.stderr) : undefined,
        exitCode: result.exitCode,
      };
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }
}

// Command Writer - generates command text instead of executing
export class CLICmdWriter extends BaseCommandProcessor {
  /**
   * Process a command by generating its text representation without executing it
   * Implements the CommandProcessor interface
   */
  async process(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    customWorkingDir?: string,
    _stdinInput?: string // Not used by writer, but kept for interface compatibility
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
    customWorkingDir?: string,
    _stdinInput?: string // Not used by writer, but kept for interface compatibility
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
        // Use canonical working directory resolution
        cwd = resolveWorkingDirectory(this.roots);
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

      return CommandResultFactory.success(fullCommandText);
    } catch (error) {
      return CommandResultFactory.fromError(error);
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
   * @param writer The command processor to use for commands that should return text (InitCommand)
   * @param mcpServer Optional MCP server for commands that support elicitation
   * @returns An array of command instances
   *
   * Note: AuthCommand is not exposed to MCP clients. Authentication is handled
   * automatically at startup via environment variables (SN_INSTANCE_URL, SN_AUTH_TYPE).
   * The auth alias is stored in the session and used by all SDK commands.
   */
  static createCommands(executor: CommandProcessor, writer?: CommandProcessor, mcpServer?: McpServer): CLICommand[] {
    // If no writer is provided, use the executor for all commands
    const textProcessor = writer || executor;

    return [
      // SDK Information Tool (using SDK flags, not commands)
      new SdkInfoCommand(executor),

      // SDK Command Tools (actual SDK subcommands)
      // Note: AuthCommand removed - auth is handled via env vars at startup
      new InitCommand(textProcessor, mcpServer), // Uses writer to generate text instead of executing
      new BuildCommand(executor),
      new InstallCommand(executor),
      new TransformCommand(executor),
      new DependenciesCommand(textProcessor), // Uses writer to generate text instead of executing
      new DownloadCommand(executor),
      new CleanCommand(executor),
      new PackCommand(executor),
    ];
  }
}
