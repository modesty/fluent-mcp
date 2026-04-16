import { CommandResult, CommandResultFactory } from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { SessionManager } from '../../utils/sessionManager.js';
import { resolveWorkingDirectory } from '../../utils/rootContext.js';
import logger from '../../utils/logger.js';

/**
 * Base class for commands that use the session working directory with root context fallback
 * Extends BaseCLICommand and adds working directory handling, auth resolution, and timeout support
 */
export abstract class SessionAwareCLICommand extends BaseCLICommand {
  /**
   * Get the working directory from the session, or use the root context as fallback.
   * Priority: session working directory > root context > project root
   * @returns The working directory to use for the command
   */
  protected getWorkingDirectory(): string | undefined {
    const sessionManager = SessionManager.getInstance();
    const sessionDir = sessionManager.getWorkingDirectory();

    if (sessionDir) {
      logger.debug(`Using session working directory: ${sessionDir}`);
      return sessionDir;
    }

    // Fallback to root context using canonical resolution
    const fallbackDir = resolveWorkingDirectory();
    logger.debug(`No session working directory, using root context: ${fallbackDir}`);
    return fallbackDir;
  }

  /**
   * Resolve authentication alias from provided value or session fallback.
   * Used by commands that require instance authentication (install, transform, dependencies, download).
   * @param providedAuth Explicit auth alias from command args
   * @returns The resolved auth alias, or undefined if none available
   */
  protected resolveAuthAlias(providedAuth?: string): string | undefined {
    if (providedAuth) {
      return providedAuth;
    }
    const sessionAuth = SessionManager.getInstance().getAuthAlias();
    if (sessionAuth) {
      logger.debug(`Auto-injecting auth alias from session: ${sessionAuth}`);
    }
    return sessionAuth;
  }

  /**
   * Execute a command that requires a working directory from the session
   * @param command The command to execute
   * @param args The command arguments
   * @param useMcpCwd Whether to use the MCP's current working directory
   * @param stdinInput Optional stdin input for interactive commands
   * @param timeoutMs Optional command-specific timeout (falls back to this.timeoutMs)
   * @returns The command result
   */
  protected async executeWithSessionWorkingDirectory(
    command: string,
    args: string[],
    useMcpCwd: boolean = false,
    stdinInput?: string,
    timeoutMs?: number
  ): Promise<CommandResult> {
    const workingDirectory = this.getWorkingDirectory();

    if (!workingDirectory) {
      return CommandResultFactory.error(
        'No working directory found. Please run the init command first to set up a working directory, or ensure MCP root context is configured.'
      );
    }

    const effectiveTimeout = timeoutMs ?? this.timeoutMs;

    try {
      return await this.commandProcessor.process(command, args, useMcpCwd, workingDirectory, stdinInput, effectiveTimeout);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }

  /**
   * Execute an SDK command with argument mapping to CLI flags.
   * Automatically resolves auth from session when 'auth' is in flagMapping but not provided in args.
   * Uses the command's timeoutMs for process execution.
   * @param sdkCommand The SDK command name (e.g., 'build', 'install')
   * @param args The command arguments object
   * @param flagMapping Optional mapping of arg names to CLI flags
   * @param positionalArgs Optional positional arguments to append at the end
   * @returns The command result
   */
  protected async executeSdkCommand(
    sdkCommand: string,
    args: Record<string, unknown>,
    flagMapping: Record<string, string | { flag: string; hasValue: boolean }> = {},
    positionalArgs: string[] = []
  ): Promise<CommandResult> {
    // Auto-resolve auth from session if 'auth' is mapped but not provided
    if ('auth' in flagMapping && !args.auth) {
      const sessionAuth = this.resolveAuthAlias();
      if (sessionAuth) {
        args = { ...args, auth: sessionAuth };
      }
    }

    // Build the full SDK command args: ['now-sdk', 'subcommand', ...flags, ...positional]
    const sdkArgs: string[] = ['now-sdk', sdkCommand];

    // Add positional arguments first (before flags)
    sdkArgs.push(...positionalArgs);

    // Add mapped flags
    for (const [argName, flagConfig] of Object.entries(flagMapping)) {
      const value = args[argName];
      if (value !== undefined && value !== null && value !== '') {
        if (typeof flagConfig === 'string') {
          // Simple string flag with value
          sdkArgs.push(flagConfig, String(value));
        } else {
          // Object config with flag and hasValue
          if (flagConfig.hasValue) {
            sdkArgs.push(flagConfig.flag, String(value));
          } else if (value) {
            // Boolean flag without value
            sdkArgs.push(flagConfig.flag);
          }
        }
      }
    }

    // Add common flags (like --debug)
    this.appendCommonFlags(sdkArgs, args);

    return this.executeWithSessionWorkingDirectory('npx', sdkArgs, false, undefined, this.timeoutMs);
  }
}
