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
 * AI-powered error analysis result
 */
export interface ErrorAnalysis {
  /** Root cause of the error */
  rootCause: string;
  /** Suggested solutions */
  suggestions: string[];
  /** Prevention tips for future */
  preventionTips: string[];
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
  /** AI-powered error analysis (optional, only when enabled and applicable) */
  errorAnalysis?: ErrorAnalysis;
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
  run(command: string, args: string[], cwd?: string, stdinInput?: string): Promise<ProcessResult>;
}

/**
 * Common interface for command processing (execution or text generation)
 */
export interface CommandProcessor {
  process(
    command: string,
    args: string[],
    useMcpCwd?: boolean,
    customWorkingDir?: string,
    stdinInput?: string
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
   * @returns The command processor instance, or undefined for commands that don't use a processor
   */
  getCommandProcessor(): CommandProcessor | undefined;
}

/**
 * Factory for creating consistent CommandResult objects
 */
export const CommandResultFactory = {
  /**
   * Normalize an unknown error to an Error instance
   */
  normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  },

  /**
   * Create a success result
   */
  success(output: string, exitCode = 0): CommandResult {
    return { exitCode, success: true, output };
  },

  /**
   * Create an error result from a message
   */
  error(message: string, exitCode = 1): CommandResult {
    return {
      exitCode,
      success: false,
      output: `Error: ${message}`,
      error: new Error(message),
    };
  },

  /**
   * Create an error result from an Error or unknown value
   */
  fromError(error: unknown, exitCode = 1): CommandResult {
    const normalizedError = CommandResultFactory.normalizeError(error);
    return {
      exitCode,
      success: false,
      output: `Error: ${normalizedError.message}`,
      error: normalizedError,
    };
  },

  /**
   * Create an error result with custom output text
   */
  errorWithOutput(output: string, error: unknown, exitCode = 1): CommandResult {
    return {
      exitCode,
      success: false,
      output,
      error: CommandResultFactory.normalizeError(error),
    };
  },
};
