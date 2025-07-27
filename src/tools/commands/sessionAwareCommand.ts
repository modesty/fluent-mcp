import { CommandResult } from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { SessionManager } from '../../utils/sessionManager.js';
import logger from '../../utils/logger.js';

/**
 * Base class for commands that use the session working directory
 * Extends BaseCLICommand and adds working directory handling
 */
export abstract class SessionAwareCLICommand extends BaseCLICommand {
  /**
   * Get the working directory from the session, or use the current directory if not set
   * @returns The working directory to use for the command
   */
  protected getWorkingDirectory(): string | undefined {
    const sessionManager = SessionManager.getInstance();
    const workingDirectory = sessionManager.getWorkingDirectory();
    
    if (workingDirectory) {
      logger.debug(`Using session working directory: ${workingDirectory}`);
    } else {
      logger.debug('No working directory found in session');
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
      return {
        exitCode: 1,
        success: false,
        output: '',
        error: new Error(
          'No working directory found. Please run the init command first to set up a working directory.'
        ),
      };
    }
    
    try {
      return await this.commandProcessor.process(command, args, useMcpCwd, workingDirectory);
    } catch (error) {
      return {
        exitCode: 1,
        success: false,
        output: '',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
