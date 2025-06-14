import { CommandArgument, CommandResult } from "../../utils/types";
import { CLIExecutor } from "../cliCommandTools.js";
import { SessionFallbackCommand } from "./sessionFallbackCommand.js";

/**
 * Command to enable debug mode for Fluent (ServiceNow SDK)
 */
export class DebugCommand extends SessionFallbackCommand {
  name = 'enable_fluent_debug';
  description = 'Return debug logs generated with a command for Fluent (ServiceNow SDK) commands';
  arguments: CommandArgument[] = [
    {
      name: 'command',
      type: 'string',
      required: false,
      description: 'The command to run with debug mode enabled',
    },
  ];

  constructor(cliExecutor: CLIExecutor) {
    super(cliExecutor);
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);
    const command = args.command as string | undefined;

    const cmdArgs = ['now-sdk', '--debug'];
    if (command) {
      cmdArgs.push(command);
    }

    return await this.executeWithFallback('npx', cmdArgs);
  }
}
