import { CLICommand, CommandArgument, CommandProcessor, CommandResult } from '../../utils/types';

/**
 * Base abstract class for all CLI commands
 * Implements the Template Method pattern for validation
 */
export abstract class BaseCLICommand implements CLICommand {
  abstract name: string;
  abstract description: string;
  abstract arguments: CommandArgument[];

  constructor(protected commandProcessor: CommandProcessor) {}

  abstract execute(args: Record<string, unknown>): Promise<CommandResult>;

  /**
   * Get the command processor used by this command
   * @returns The command processor instance
   */
  getCommandProcessor(): CommandProcessor {
    return this.commandProcessor;
  }

  // Template method for common validation
  protected validateArgs(args: Record<string, unknown>): void {
    for (const arg of this.arguments) {
      if (arg.required && !(arg.name in args)) {
        throw new Error(`Required argument '${arg.name}' is missing`);
      }
    }
  }
}
