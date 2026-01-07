import { CommandResult, CommandResultFactory } from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { SessionManager } from '../../utils/sessionManager.js';
import { getPrimaryRootPath } from '../../utils/rootContext.js';
import logger from '../../utils/logger.js';

/**
 * Base class for commands that use the session working directory with root context fallback
 * Extends BaseCLICommand and adds working directory handling
 */
export abstract class SessionAwareCLICommand extends BaseCLICommand {
  /**
   * Get the working directory from the session, or use the root context as fallback
   * @returns The working directory to use for the command
   */
  protected getWorkingDirectory(): string | undefined {
    const sessionManager = SessionManager.getInstance();
    let workingDirectory = sessionManager.getWorkingDirectory();
    
    if (workingDirectory) {
      logger.debug(`Using session working directory: ${workingDirectory}`);
    } else {
      // Fallback to root context when no session working directory is set
      try {
        workingDirectory = getPrimaryRootPath();
        logger.debug(`No session working directory found, using root context: ${workingDirectory}`);
      } catch (error) {
        logger.debug(`No working directory found in session or root context: ${error}`);
      }
    }
    
    return workingDirectory;
  }

  /**
   * Execute a command that requires a working directory from the session
   * @param command The command to execute
   * @param args The command arguments
   * @param useMcpCwd Whether to use the MCP's current working directory
   * @returns The command result
   */
  protected async executeWithSessionWorkingDirectory(
    command: string,
    args: string[],
    useMcpCwd: boolean = false
  ): Promise<CommandResult> {
    const workingDirectory = this.getWorkingDirectory();

    if (!workingDirectory) {
      return CommandResultFactory.error(
        'No working directory found. Please run the init command first to set up a working directory, or ensure MCP root context is configured.'
      );
    }

    try {
      return await this.commandProcessor.process(command, args, useMcpCwd, workingDirectory);
    } catch (error) {
      return CommandResultFactory.fromError(error);
    }
  }

  /**
   * Execute an SDK command with argument mapping to CLI flags
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

    return this.executeWithSessionWorkingDirectory('npx', sdkArgs);
  }
}
