/**
 * Type definitions for utility functions
 */

// Domain Models
export interface CommandArgument {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
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
 * Resource types supported by the loader
 */
export enum ResourceTypeEnum {
  SPEC = 'spec',
  SNIPPET = 'snippet',
  INSTRUCT = 'instruct',
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
  run(command: string, args: string[], cwd?: string): Promise<ProcessResult>;
}

/**
 * Common interface for command processing (execution or text generation)
 */
export interface CommandProcessor {
  process(
    command: string,
    args: string[],
    useMcpCwd?: boolean,
    customWorkingDir?: string
  ): Promise<CommandResult>;
}

export interface CommandExecutor {
  execute(args: Record<string, unknown>): Promise<CommandResult>;
}

/**
 * Metadata annotations for tools: https://modelcontextprotocol.io/docs/concepts/tools
 */
export interface CommandAnnotations {
  title?: string;             // Human-readable title for the tool
  readOnlyHint?: boolean;     // If true, the tool does not modify its environment
  destructiveHint?: boolean;  // If true, the tool may perform destructive updates
  idempotentHint?: boolean;   // If true, the tool can be run multiple times with the same result
  openWorldHint?: boolean;    // If true, the tool is open-world and can interact with external systems
  [key: string]: unknown;
  // idempotentHint?: boolean;  // If true, repeated calls with same args have no additional effect
  // openWorldHint?: boolean;   // If true, tool interacts with external entities
}

export interface CommandMetadata {
  name: string;
  description: string;
  arguments: CommandArgument[];
  annotations?: CommandAnnotations;
  _meta?: { [key: string]: unknown };
}

export interface CLICommand extends CommandExecutor, CommandMetadata {
  /**
   * Get the command processor used by this command
   * @returns The command processor instance
   */
  getCommandProcessor(): CommandProcessor;
}
