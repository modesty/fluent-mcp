#!/usr/bin/env node

import { FluentMcpServer } from './server/fluentMCPServer.js';
import logger from './utils/logger.js';
import { getConfig } from './config.js';

/**
 * Main entry point for the Fluent MCP server for ServiceNow SDK
 * This server implements the Model Context Protocol to provide ServiceNow SDK functionality
 * to AI assistants and developers through a standardized interface.
 */

// Get configuration
const config = getConfig();

// Create a global server instance
const server = new FluentMcpServer();

// Handle process signals for graceful shutdown
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Handle unhandled errors and exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error, {
    type: 'uncaughtException',
    processId: process.pid
  });
  handleShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection',
    reason instanceof Error ? reason : new Error(String(reason)),
    { type: 'unhandledRejection', processId: process.pid }
  );
});

async function handleShutdown() {
  logger.info('Shutting down server...', { processId: process.pid });
  try {
    await server.stop();
    logger.info('Server stopped successfully', { processId: process.pid });
  } catch (error) {
    logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)));
  }
  process.exit(0);
}

// Start the server
async function main() {
  try {
    logger.info('Initializing Fluent MCP server...', {
      name: config.name,
      version: config.version,
    });

    // Use the global server instance instead of creating a new one
    await server.start();

    logger.info('Fluent MCP Server is ready and waiting for connections', {
      logLevel: config.logLevel,
    });
  } catch (error) {
    logger.error('Error initializing Fluent MCP Server',
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}

main();
