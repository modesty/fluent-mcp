/**
 * LoggingManager handles server-specific logging functionality
 * and abstracts logging operations from the server implementation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import logger from './logger.js';
import { ServerStatus } from '../types.js';
import { getConfig } from '../config.js';

export class LoggingManager {
  private mcpServer?: McpServer;

  /**
   * Initialize the logging manager
   */
  constructor() {
    // Nothing to do at initialization
  }

  /**
   * Configure the logger with an MCP server instance
   * @param mcpServer The MCP server instance
   */
  configure(mcpServer: McpServer): void {
    this.mcpServer = mcpServer;
    
    // Connect logger to MCP server for notifications
    logger.setMcpServer(mcpServer);
    
    // Set up logging/setLevel handler
    logger.setupLoggingHandlers();
  }

  /**
   * Log server startup
   */
  logServerStarting(): void {
    const config = getConfig();
    logger.info('Starting MCP server...', {version: config.version});
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
      error instanceof Error ? error : new Error(String(error)),
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
      error instanceof Error ? error : new Error(String(error)),
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
      error instanceof Error ? error : new Error(String(error))
    );
  }

  /**
   * Log prompt listing failed
   * @param error The error that occurred
   */
  logPromptListingFailed(error: unknown): void {
    logger.error(
      'Failed to list prompts',
      error instanceof Error ? error : new Error(String(error))
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
      error instanceof Error ? error : new Error(String(error))
    );
  }

  /**
   * Log when roots have changed
   * @param roots The updated list of roots
   */
  logRootsChanged(roots: { uri: string; name?: string }[]): void {
    logger.info('Roots list changed', { roots });
  }
}

// Create and export a singleton instance
export const loggingManager = new LoggingManager();
export default loggingManager;
