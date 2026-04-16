import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to clean output directory of a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class CleanCommand extends SessionAwareCLICommand {
  name = 'clean_fluent_app';
  description = 'Delete the build output directory of a Fluent (ServiceNow SDK) application. This is a destructive operation that removes all compiled artifacts. Run build_fluent_app afterward to regenerate. Does NOT require authentication.';
  annotations = { destructiveHint: true, idempotentHint: true };
  timeoutMs = 15_000;
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
