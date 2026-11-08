#!/usr/bin/env node

import { FluentMcpServer } from './server/fluentMCPServer.js';
import logger from './utils/logger.js';
import { getConfig } from './config.js';
import { CommandResultFactory } from './utils/types.js';

/**
 * Main entry point for the Fluent MCP server for ServiceNow SDK
 * This server implements the Model Context Protocol to provide ServiceNow SDK functionality
 * to AI assistants and developers through a standardized interface.
 */

// Get configuration
const config = getConfig();

// Create a global server instance
const server = new FluentMcpServer();

/** Exit status of the process: 0 for a requested shutdown, 1 for a fatal error. */
type ExitStatus = 0 | 1;

/** Upper bound on cleanup, so a fatal error cannot leave a hung process behind. */
const SHUTDOWN_TIMEOUT_MS = 5_000;

let exitStatus: ExitStatus = 0;
let shutdown: Promise<void> | undefined;

/**
 * Stop the server once and exit. Single-flight: a signal or fatal error that
 * arrives while shutdown runs joins it. The status only rises, so a later signal
 * never turns a fatal exit into 0, and a failed or timed-out cleanup exits 1.
 */
function shutdownWith(status: ExitStatus): Promise<void> {
  exitStatus = Math.max(exitStatus, status) as ExitStatus;
  process.exitCode = exitStatus;
  shutdown ??= stopServer().then(() => process.exit(exitStatus));
  return shutdown;
}

async function stopServer(): Promise<void> {
  logger.info('Shutting down server...', { processId: process.pid });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Shutdown did not finish within ${SHUTDOWN_TIMEOUT_MS} ms`)), SHUTDOWN_TIMEOUT_MS);
  });
  try {
    await Promise.race([server.stop(), timeout]);
    logger.info('Server stopped successfully', { processId: process.pid });
  } catch (error) {
    exitStatus = 1;
    logger.error('Error during shutdown', CommandResultFactory.normalizeError(error));
  } finally {
    clearTimeout(timer);
  }
}

process.on('SIGINT', () => void shutdownWith(0));
process.on('SIGTERM', () => void shutdownWith(0));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error, {
    type: 'uncaughtException',
    processId: process.pid
  });
  void shutdownWith(1);
});

// Fatal, like an uncaught exception: this is Node's own default
// (--unhandled-rejections=throw), which installing a handler would otherwise
// replace with log-and-continue on a server in an unknown state.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection',
    reason instanceof Error ? reason : new Error(String(reason)),
    { type: 'unhandledRejection', processId: process.pid }
  );
  void shutdownWith(1);
});

// Start the server
async function main(): Promise<void> {
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
      CommandResultFactory.normalizeError(error)
    );
    await shutdownWith(1);
  }
}

main();
