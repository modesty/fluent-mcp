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
    const sdkArgs = ['now-sdk', 'dependencies'];

    // Add optional arguments if provided
    if (args.auth) {
      sdkArgs.push('--auth', args.auth as string);
    }

    if (args.debug) {
      sdkArgs.push('--debug');
    }

    return this.executeWithSessionWorkingDirectory('npx', sdkArgs);
  }
}
