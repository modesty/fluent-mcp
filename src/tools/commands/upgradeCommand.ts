import { CommandArgument, CommandResult } from "../../utils/types";
import { CLIExecutor } from "../cliCommandTools.js";
import { BaseCLICommand } from "./baseCommand.js";

/**
 * Command to upgrade Fluent (ServiceNow SDK) to the latest version
 */
export class UpgradeCommand extends BaseCLICommand {
  name = 'upgrade_fluent';
  description = 'Upgrade globally installed Fluent (ServiceNow SDK) to the latest version. For a typical Fluent project, Fluent (ServiceNow SDK) is installed locally, not in global.';
  arguments: CommandArgument[] = [
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Enable debug mode for the upgrade process',
      defaultValue: false,
    },
  ];

  constructor(cliExecutor: CLIExecutor) {
    super(cliExecutor);
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);
    const debug = args.debug as boolean | undefined;

    const cmdArgs = ['now-sdk', 'upgrade'];

    if (debug) {
      cmdArgs.push('--debug');
    }

    return await this.cliExecutor.execute('npx', cmdArgs, true);
  }
}
