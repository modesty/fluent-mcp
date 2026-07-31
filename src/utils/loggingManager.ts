/**
 * LoggingManager handles server-specific logging functionality
 * and abstracts logging operations from the server implementation
 */

import logger from './logger.js';
import { CommandResultFactory } from './types.js';
import { AuthValidationResult, ServerStatus } from '../types.js';
import { getConfig } from '../config.js';

export class LoggingManager {
  /**
   * Log authentication state immediately to stderr through the semantic logger
   * surface. Only the allow-listed fields are included so credentials can never
   * leak through an auth result.
   */
  logAuthValidationResult(result: AuthValidationResult): void {
    const context: Record<string, unknown> = {
      status: result.status,
      timestamp: result.timestamp,
    };
    if (result.alias) context.alias = result.alias;
    if (result.host) context.host = result.host;
    if (result.authType) context.authType = result.authType;
    if (result.isDefault !== undefined) context.isDefault = result.isDefault;
    if (result.actionRequired) context.actionRequired = result.actionRequired;

    switch (result.status) {
      case 'authenticated':
        logger.info(result.message, context);
        break;
      case 'skipped':
        logger.debug(result.message, context);
        break;
      case 'not_authenticated':
        logger.notice(result.message, context);
        break;
      case 'validation_error':
        logger.warn(result.message, context);
        break;
    }
  }

  /**
   * Log server startup
   */
  logServerStarting(): void {
    const config = getConfig();
    logger.info('Starting MCP server...', { name: config.name, version: config.version });
  }

  /**
   * Log server successfully started
   */
  logServerStarted(): void {
    logger.info('MCP server initialized and connected via stdio');
  }

  /**
   * Log server already running
   */
  logServerAlreadyRunning(): void {
    logger.info('MCP server is already running');
  }

  /**
   * Log server not running
   * @param status Current server status
   */
  logServerNotRunning(status: ServerStatus): void {
    logger.info('MCP server is not running', { status });
  }

  /**
   * Log server stopping
   */
  logServerStopping(): void {
    logger.info('Stopping MCP server...');
  }

  /**
   * Log server stopped
   */
  logServerStopped(): void {
    logger.info('MCP server stopped');
  }

  /**
   * Log server start failure
   * @param error Error that occurred during startup
   * @param status Current server status
   */
  logServerStartFailed(error: Error | unknown, status: ServerStatus): void {
    logger.error(
      'Failed to start MCP server',
      CommandResultFactory.normalizeError(error),
      { status }
    );
  }

  /**
   * Log server stop failure
   * @param error Error that occurred during shutdown
   * @param status Current server status
   */
  logServerStopFailed(error: Error | unknown, status: ServerStatus): void {
    logger.error(
      'Error stopping MCP server',
      CommandResultFactory.normalizeError(error),
      { status }
    );
  }

  /**
   * Log resource listing failure
   * @param error Error that occurred during resource listing
   */
  logResourceListingFailed(error: Error | unknown): void {
    logger.error(
      'Error listing resources', 
      CommandResultFactory.normalizeError(error)
    );
  }

  /**
   * Log prompt listing failed
   * @param error The error that occurred
   */
  logPromptListingFailed(error: unknown): void {
    logger.error(
      'Failed to list prompts',
      CommandResultFactory.normalizeError(error)
    );
  }

  /**
   * Log prompt retrieval failed
   * @param promptName The name of the prompt that failed to retrieve
   * @param error The error that occurred
   */
  logPromptRetrievalFailed(promptName: string, error: unknown): void {
    logger.error(
      `Failed to get prompt '${promptName}'`,
      CommandResultFactory.normalizeError(error)
    );
  }

  /**
   * Log when roots have changed
   * @param roots The updated list of roots
   */
  logRootsChanged(roots: { uri: string; name?: string }[]): void {
    // Log summary of roots for normal log levels
    logger.info('Roots list changed', { roots });
    
    // Log detailed information at debug level
    logger.debug('Roots list details', {
      count: roots.length,
      paths: roots.map(r => r.uri),
      rootsWithNames: roots.filter(r => r.name).length,
      timestamp: new Date().toISOString()
    });
  }
}

// Create and export a singleton instance
export const loggingManager = new LoggingManager();
export default loggingManager;
