import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to install a Fluent (ServiceNow SDK) application to a ServiceNow instance
 * Uses the session's working directory
 */
export class InstallCommand extends SessionAwareCLICommand {
  name = 'deploy_fluent_app';
  description = 'Deploy the Fluent (ServiceNow SDK) application to a ServiceNow instance by auth alias or default auth';
  arguments: CommandArgument[] = [
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'The authentication alias to use',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    const sdkArgs = ['now-sdk', 'install'];

    if (args.auth) {
      sdkArgs.push('--auth', args.auth as string);
    }
    this.appendCommonFlags(sdkArgs, args);

    return this.executeWithSessionWorkingDirectory('npx', sdkArgs);
  }
}
