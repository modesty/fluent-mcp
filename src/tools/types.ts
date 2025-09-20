/**
 * Type definitions for the MCP tools
 */

/**
 * ServiceNow SDK command type
 */
export enum SdkCommandType {
  VERSION = 'version',
  HELP = 'help',
  DEBUG = 'debug',
  AUTH = 'auth',
  INIT = 'init',
  BUILD = 'build',
  INSTALL = 'install',
  TRANSFORM = 'transform',
  DEPENDENCIES = 'dependencies',
}

/**
 * Resource query parameters
 */
export interface ResourceQuery {
  /** The metadata type to query for */
  metadataType: string;
  /** Optional identifier for a specific resource */
  id?: string;
}
