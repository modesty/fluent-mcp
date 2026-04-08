import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to install a Fluent (ServiceNow SDK) application to a ServiceNow instance
 * Uses the session's working directory
 */
export class InstallCommand extends SessionAwareCLICommand {
  name = 'deploy_fluent_app';
  description = 'Deploy the Fluent (ServiceNow SDK) application to a ServiceNow instance';
  arguments: CommandArgument[] = [
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    {
      name: 'skipFlowActivation',
      type: 'boolean',
      required: false,
      description: 'Skip automatic flow activation during deployment. By default in SDK v4.5.0, flows and subflows are auto-published on install.',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    return this.executeSdkCommand('install', args, {
      auth: '--auth',
      skipFlowActivation: { flag: '--skip-flow-activation', hasValue: false },
    });
  }
}
