import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to build a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class BuildCommand extends SessionAwareCLICommand {
  name = 'build_fluent_app';
  description = 'Build a Fluent (ServiceNow SDK) application package from source code. Requires a valid Fluent project directory with now.config.json. Run after init_fluent_app and before deploy_fluent_app. Does NOT require instance authentication.';
  annotations = { idempotentHint: true };
  timeoutMs = 60_000;
  arguments: CommandArgument[] = [
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    return this.executeSdkCommand('build', args);
  }
}
