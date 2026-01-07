import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to transform files in a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class TransformCommand extends SessionAwareCLICommand {
  name = 'fluent_transform';
  description = 'Download and convert XML records from instance or from a local path into Fluent source code';
  arguments: CommandArgument[] = [
    {
      name: 'from',
      type: 'string',
      required: false,
      description: 'Path to local XML file(s)/directory to transform',
    },
    {
      name: 'directory',
      type: 'string',
      required: false,
      description: 'Path to "package.json", default to current working directory',
    },
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
    {
      name: 'preview',
      type: 'boolean',
      required: false,
      description: 'Preview fluent output and any transform errors without saving, default false',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    return this.executeSdkCommand('transform', args, {
      from: '--from',
      directory: '--directory',
      auth: '--auth',
      preview: '--preview',
    });
  }
}
