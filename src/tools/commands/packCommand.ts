import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to pack a Fluent (ServiceNow SDK) application into installable artifact
 * Uses the session's working directory
 */
export class PackCommand extends SessionAwareCLICommand {
  name = 'pack_fluent_app';
  description = 'Zip built Fluent (ServiceNow SDK) application into installable artifact';
  arguments: CommandArgument[] = [
    {
      name: 'source',
      type: 'string',
      required: false,
      description: 'Path to the directory that contains package.json configuration',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    const sdkArgs = ['now-sdk', 'pack'];

    // Add optional source directory if provided (overrides session working directory)
    if (args.source) {
      sdkArgs.push('--source', args.source as string);
    }

    // Add debug flag if specified
    if (args.debug) {
      sdkArgs.push('--debug');
    }

    return this.executeWithSessionWorkingDirectory('npx', sdkArgs);
  }
}
