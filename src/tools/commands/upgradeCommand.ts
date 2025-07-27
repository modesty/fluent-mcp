import { CommandArgument, CommandProcessor, CommandResult } from '../../utils/types';

import { BaseCLICommand } from './baseCommand.js';

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

  constructor(commandProcessor: CommandProcessor) {
    super(commandProcessor);
  }

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    this.validateArgs(args);
    const debug = args.debug as boolean | undefined;

    const cmdArgs = ['now-sdk', 'upgrade'];

    if (debug) {
      cmdArgs.push('--debug');
    }

    return await this.commandProcessor.process('npx', cmdArgs, true);
  }
}
