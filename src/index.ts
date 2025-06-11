#!/usr/bin/env node

import { FluentMcpServer } from './server/fluentMCPServer.js';

/**
 * Main entry point for the Fluent MCP server for ServiceNow SDK
 * This server implements the Model Context Protocol to provide ServiceNow SDK functionality
 * to AI assistants and developers through a standardized interface.
 */

// Create a global server instance
const server = new FluentMcpServer();

// Handle process signals for graceful shutdown
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  handleShutdown();
});

async function handleShutdown() {
//   console.log('Shutting down...');
  try {
    await server.stop();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
}

// Start the server
async function main() {
  try {
    // console.log('Initializing Fluent MCP server...');

    // Use the global server instance instead of creating a new one
    await server.start();

    // console.log('Fluent MCP Server is ready and waiting for connections');
  } catch (error) {
    // console.error('Error initializing Fluent MCP Server:', error);
    process.exit(1);
  }
}

main();
