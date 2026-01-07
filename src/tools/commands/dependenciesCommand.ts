import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to manage dependencies in a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class DependenciesCommand extends SessionAwareCLICommand {
  name = 'download_fluent_dependencies';
  description = 'Download configured dependencies in now.config.json and TypeScript type definitions for use in the application';
  arguments: CommandArgument[] = [
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    return this.executeSdkCommand('dependencies', args, {
      auth: '--auth',
    });
  }
}
