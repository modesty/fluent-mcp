import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to clean output directory of a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class CleanCommand extends SessionAwareCLICommand {
  name = 'clean_fluent_app';
  description = 'Clean up output directory of a Fluent (ServiceNow SDK) application';
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
    return this.executeSdkCommand('clean', args, {
      source: '--source',
    });
  }
}
