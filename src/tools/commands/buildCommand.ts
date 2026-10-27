import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';

/**
 * Command to build a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class BuildCommand extends SessionAwareCLICommand {
  name = 'build_fluent_app';
  description = 'Build a Fluent (ServiceNow SDK) application package from source code. Requires a valid Fluent project directory with now.config.json. Run after init_fluent_app and before deploy_fluent_app. Does NOT require instance authentication.';
  annotations = { idempotentHint: true };
  // Large-app builds can exceed one minute; raised for headroom (P0.2).
  timeoutMs = 180_000;
  arguments: CommandArgument[] = [
    WORKING_DIRECTORY_ARGUMENT,
    {
      name: 'sourceMap',
      type: 'boolean',
      required: false,
      description: 'Write a source-manifest.json into the build output that maps build output back to source (SDK v4.14.0+). Overrides now.config.json `sourceMap`, which defaults to true only for ServiceNow (non-x_, non-global) scopes. Omit to keep the project setting.',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    // `--sourceMap` has no CLI default (the now.config.json value applies), so an
    // explicit false must be sent as the yargs negation to override a true config.
    return this.executeSdkCommand(
      'build',
      args,
      { sourceMap: { flag: '--sourceMap', hasValue: false, negatable: true } },
      [],
      signal
    );
  }
}
