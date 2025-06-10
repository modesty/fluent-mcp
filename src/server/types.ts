/**
 * Type definitions for the MCP server
 */

/**
 * Status of the MCP Server
 */
export enum ServerStatus {
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
}

/**
 * Server event types
 */
export enum ServerEventType {
  START = 'start',
  STOP = 'stop',
  ERROR = 'error',
}
