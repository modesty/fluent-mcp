import { CommandArgument, CommandResult } from "../../utils/types";
import { CLIExecutor } from "../cliCommandTools.js";
import { BaseCLICommand } from "./baseCommand.js";

/**
 * Command to upgrade Fluent (ServiceNow SDK) to the latest version
 */
export class UpgradeCommand extends BaseCLICommand {
  name = 'upgrade_fluent';
  description = 'Upgrade Fluent (ServiceNow SDK) to the latest version';
  arguments: CommandArgument[] = [
    {
      name: 'check',
      type: 'boolean',
      required: false,
      description: 'Only check for updates without upgrading',
      defaultValue: false,
    },
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
    const check = args.check as boolean | undefined;
    const debug = args.debug as boolean | undefined;

    const cmdArgs = ['now-sdk', 'upgrade'];

    if (check) {
      cmdArgs.push('--check');
    }

    if (debug) {
      cmdArgs.push('--debug');
      cmdArgs.push('true');
    }

    return await this.cliExecutor.execute('npx', cmdArgs, true);
  }
}
