/**
 * Type definitions for utility functions
 */

/**
 * Command execution result
 */
export interface CommandResult {
  /** Exit code of the command */
  exitCode: number;
  /** Standard output from the command */
  stdout: string;
  /** Standard error output from the command */
  stderr: string;
  /** Error that occurred during execution, if any */
  error?: Error;
}

/**
 * Resource loading result
 */
export interface ResourceResult {
  /** Content of the loaded resource */
  content: string;
  /** Path to the resource */
  path: string;
  /** Metadata type of the resource */
  metadataType: string;
  /** Resource type (spec, snippet, instruct) */
  resourceType: string;
  /** Whether the resource was found */
  found: boolean;
}
