import { CommandArgument, CommandResult } from "../../utils/types";
import { CLIExecutor } from "../cliCommandTools.js";
import { BaseCLICommand } from "./baseCommand.js";

/**
 * Command to get help information about Fluent (ServiceNow SDK) commands
 */
export class HelpCommand extends BaseCLICommand {
  name = 'get_fluent_help';
  description = 'Get help information about Fluent (ServiceNow SDK) commands';
  arguments: CommandArgument[] = [
    {
      name: 'command',
      type: 'string',
      required: false,
      description: 'The specific command to get help for',
    },
  ];

  constructor(cliExecutor: CLIExecutor) {
    super(cliExecutor);
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);
    const command = args.command as string | undefined;

    if (command) {
      return await this.cliExecutor.execute('npx', ['now-sdk', command, '--help'], true);
    } else {
      return await this.cliExecutor.execute('npx', ['now-sdk', '--help'], true);
    }
  }
}
