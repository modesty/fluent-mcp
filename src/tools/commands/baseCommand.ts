import { CLICommand, CommandArgument, CommandResult } from "../../utils/types";
import { CLIExecutor } from "../cliCommandTools.js";

/**
 * Base abstract class for all CLI commands
 * Implements the Template Method pattern for validation
 */
export abstract class BaseCLICommand implements CLICommand {
  abstract name: string;
  abstract description: string;
  abstract arguments: CommandArgument[];

  constructor(protected cliExecutor: CLIExecutor) {}

  abstract execute(args: Record<string, unknown>): Promise<CommandResult>;

  // Template method for common validation
  protected validateArgs(args: Record<string, unknown>): void {
    for (const arg of this.arguments) {
      if (arg.required && !(arg.name in args)) {
        throw new Error(`Required argument '${arg.name}' is missing`);
      }
    }
  }
}
