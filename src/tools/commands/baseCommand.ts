import { CLICommand, CommandArgument, CommandProcessor, CommandResult } from '../../utils/types.js';

/**
 * Dangerous shell characters that could enable command injection
 * These patterns are rejected in string arguments to prevent security vulnerabilities
 */
const DANGEROUS_SHELL_PATTERN = /[;&|`$(){}[\]<>\\]/;

/**
 * Base abstract class for all CLI commands
 * Implements the Template Method pattern for validation
 */
export abstract class BaseCLICommand implements CLICommand {
  abstract name: string;
  abstract description: string;
  abstract arguments: CommandArgument[];

  constructor(protected commandProcessor: CommandProcessor) { }

  abstract execute(args: Record<string, unknown>): Promise<CommandResult>;

  /**
   * Get the command processor used by this command
   * @returns The command processor instance
   */
  getCommandProcessor(): CommandProcessor {
    return this.commandProcessor;
  }

  /**
   * Sanitize a string argument to prevent command injection
   * @param value The value to sanitize
   * @param argName The argument name (for error messages)
   * @returns The sanitized string
   * @throws Error if the value contains dangerous characters
   */
  protected sanitizeStringArg(value: unknown, argName: string): string {
    const str = String(value);
    if (DANGEROUS_SHELL_PATTERN.test(str)) {
      const truncated = str.length > 50 ? `${str.substring(0, 50)}...` : str;
      throw new Error(
        `Invalid characters in argument '${argName}': "${truncated}". ` +
        'Shell metacharacters are not allowed for security reasons.'
      );
    }
    return str;
  }

  /**
   * Validate and sanitize command arguments
   * - Checks required arguments are present
   * - Validates argument types match expected types
   * - Sanitizes string arguments to prevent command injection
   * @param args The arguments to validate
   * @throws Error if validation fails
   */
  protected validateArgs(args: Record<string, unknown>): void {
    for (const arg of this.arguments) {
      const value = args[arg.name];

      // Check required arguments are present
      if (arg.required && !(arg.name in args)) {
        throw new Error(`Required argument '${arg.name}' is missing`);
      }

      // Skip validation for undefined optional arguments
      if (value === undefined || value === null) {
        continue;
      }

      // Validate type and sanitize
      switch (arg.type) {
        case 'string':
          if (typeof value !== 'string') {
            throw new Error(`Argument '${arg.name}' must be a string, got ${typeof value}`);
          }
          // Sanitize string arguments to prevent command injection
          this.sanitizeStringArg(value, arg.name);
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            throw new Error(`Argument '${arg.name}' must be a valid number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new Error(`Argument '${arg.name}' must be a boolean`);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            throw new Error(`Argument '${arg.name}' must be an array`);
          }
          // Sanitize array elements if they are strings
          for (const item of value) {
            if (typeof item === 'string') {
              this.sanitizeStringArg(item, `${arg.name}[]`);
            }
          }
          break;
      }
    }
  }

  /**
   * Append common SDK flags to the command arguments
   * @param sdkArgs The array of SDK arguments to append to
   * @param args The command arguments object
   */
  protected appendCommonFlags(sdkArgs: string[], args: Record<string, unknown>): void {
    if (args.debug) {
      sdkArgs.push('--debug');
    }
  }
}
