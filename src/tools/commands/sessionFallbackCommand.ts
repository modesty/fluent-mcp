import fs from 'node:fs';
import { CommandResult, CommandResultFactory } from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { SessionManager } from '../../utils/sessionManager.js';
import logger from '../../utils/logger.js';
import { getProjectRootPath } from '../../config.js';

/**
 * Base class for commands that use the session working directory with fallback to project root
 * Extends BaseCLICommand and adds working directory handling with fallback
 */
export abstract class SessionFallbackCommand extends BaseCLICommand {
  /**
   * Get the working directory from the session, or fall back to the project root if not set
   * @returns The working directory to use for the command
   */
  protected getWorkingDirectoryWithFallback(): string {
    const sessionManager = SessionManager.getInstance();
    const sessionWorkingDir = sessionManager.getWorkingDirectory();
    
    // If we have a working directory from the session, use it
    // Note: In tests, we skip the fs.existsSync check since the path is mocked
    if (sessionWorkingDir) {
      // In production, verify the directory exists
      if (process.env.NODE_ENV !== 'test' && !fs.existsSync(sessionWorkingDir)) {
        logger.warn(`Session working directory does not exist: ${sessionWorkingDir}, falling back to project root`);
      } else {
        logger.debug(`Using session working directory: ${sessionWorkingDir}`);
        return sessionWorkingDir;
      }
    }
    
    // Fall back to the project root directory
    const projectRoot = getProjectRootPath();
    
    // Log for debugging
    logger.info(`Project root determined as: ${projectRoot}`);
    
    // Ensure we have a valid project root path that's not the system root
    if (!projectRoot || projectRoot === '/' || projectRoot === '\\' || 
        (process.env.NODE_ENV !== 'test' && !fs.existsSync(projectRoot))) {
      const cwd = process.cwd();
      logger.info(`Invalid project root: ${projectRoot}, falling back to current working directory: ${cwd}`);
      return cwd;
    }
    
    logger.info(`No valid working directory found in session, using project root: ${projectRoot}`);
    return projectRoot;
  }

  /**
   * Execute a command with working directory from session or fallback to project root
   * @param command The command to execute
   * @param args The command arguments
   * @param useMcpCwd Whether to use the MCP's current working directory instead of the working directory
   * @returns The command result
   */
  protected async executeWithFallback(
    command: string, 
    args: string[], 
    useMcpCwd: boolean = false
  ): Promise<CommandResult> {
    // If explicitly requested, use the MCP root-based CWD
    if (useMcpCwd) {
      return await this.commandProcessor.process(command, args, true);
    }

    // Prefer session working directory when available
    const sessionManager = SessionManager.getInstance();
    const sessionWorkingDir = sessionManager.getWorkingDirectory();

    // Use session working directory if it exists (skip fs check in tests)
    if (
      sessionWorkingDir &&
      (process.env.NODE_ENV === 'test' || fs.existsSync(sessionWorkingDir))
    ) {
      try {
        return await this.commandProcessor.process(command, args, false, sessionWorkingDir);
      } catch (error) {
        return CommandResultFactory.fromError(error);
      }
    }

    // Fallback: use MCP server's root as the working directory
    // This ensures root-based CWD is applicable to all fallback commands
    return await this.commandProcessor.process(command, args, true);
  }
}
