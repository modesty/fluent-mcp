/**
 * Type definitions for utility functions
 */

// Domain Models
export interface CommandArgument {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Exit code of the command */
  exitCode: number;
  success: boolean;
  output: string;
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

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Abstractions (Dependency Inversion)
export interface ProcessRunner {
  run(command: string, args: string[]): Promise<ProcessResult>;
}

export interface CommandExecutor {
  execute(args: Record<string, unknown>): Promise<CommandResult>;
}

export interface CommandMetadata {
  name: string;
  description: string;
  arguments: CommandArgument[];
}

export interface CLICommand extends CommandExecutor, CommandMetadata {
}
