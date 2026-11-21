import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';
import { DEBUG_ARGUMENT } from './baseCommand.js';

/**
 * Command to generate the shell command for downloading dependencies in a
 * Fluent (ServiceNow SDK) application. Wired to CLICmdWriter: returns command
 * text without executing it directly.
 */
export class DependenciesCommand extends SessionAwareCLICommand {
  name = 'download_fluent_dependencies';
  description = 'Generate the shell command to download configured dependencies from now.config.json and TypeScript type definitions (tables, roles, and script types) for a Fluent application. Does NOT execute the command directly: returns a shell command that enters the project directory and runs `now-sdk dependencies` in your terminal, with instance auth auto-injected from session (or pass auth explicitly). Run this after init_fluent_app to set up type definitions before development.';
  // Returns command text via CLICmdWriter without executing or modifying local/instance state.
  annotations = { readOnlyHint: true, idempotentHint: true };
  arguments: CommandArgument[] = [
    WORKING_DIRECTORY_ARGUMENT,
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    DEBUG_ARGUMENT
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    return this.executeSdkCommand('dependencies', args, {
      auth: '--auth',
    });
  }
}
