import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SOURCE_ARGUMENT, SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';
import { DEBUG_ARGUMENT } from './baseCommand.js';

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
    WORKING_DIRECTORY_ARGUMENT,
    SOURCE_ARGUMENT,
    DEBUG_ARGUMENT
  ];

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    return this.executeSdkCommand('clean', args, {
      source: '--source',
    }, [], signal);
  }
}
