import type { z } from 'zod';
import { CLICommand, CommandArgument, CommandProcessor, CommandResult } from '../../utils/types.js';
import { assertArguments, buildInputZodSchema } from '../toolSchema.js';

/**
 * Base abstract class for all CLI commands
 * Implements the Template Method pattern for validation
 */
export abstract class BaseCLICommand implements CLICommand {
  abstract name: string;
  abstract description: string;
  abstract arguments: CommandArgument[];
  timeoutMs?: number;

  constructor(protected commandProcessor: CommandProcessor) { }

  abstract execute(args: Record<string, unknown>): Promise<CommandResult>;

  /**
   * Get the command processor used by this command
   * @returns The command processor instance
   */
  getCommandProcessor(): CommandProcessor {
    return this.commandProcessor;
  }

  private inputSchema?: z.ZodType;

  /**
   * Validate the arguments with the command's input schema: the same one
   * `tools/call` enforces (required arguments, types, each argument's domain,
   * and no control characters in plain text). A caller that reaches `execute()`
   * directly, such as the internal `AuthCommand` run, is held to the same
   * contract. There is no shell-metacharacter check: the executor spawns
   * shell-free, every option is one `--flag=value` entry (`cliOption`), and the
   * one path a shell sees shell-escapes every entry (`CLICmdWriter`).
   * @param args The arguments to validate
   * @throws Error naming every argument that fails
   */
  protected validateArgs(args: Record<string, unknown>): void {
    this.inputSchema ??= buildInputZodSchema(this.arguments);
    assertArguments(this.name, this.inputSchema, args);
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
