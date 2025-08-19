import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to build a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class BuildCommand extends SessionAwareCLICommand {
  name = 'build_fluent_app';
  description = 'Build the Fluent (ServiceNow SDK) application located in the current working directory.';
  arguments: CommandArgument[] = [
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    const sdkArgs = ['now-sdk', 'build'];
    
    // Add debug flag if specified
    if (args.debug) {
      sdkArgs.push('--debug');
    }

    return this.executeWithSessionWorkingDirectory('npx', sdkArgs);
  }
}
