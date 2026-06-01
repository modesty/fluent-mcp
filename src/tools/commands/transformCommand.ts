import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to transform files in a Fluent (ServiceNow SDK) application
 * Uses the session's working directory
 */
export class TransformCommand extends SessionAwareCLICommand {
  name = 'fluent_transform';
  description = 'Download and convert XML metadata records from a ServiceNow instance or local path into Fluent source code. Requires instance authentication when downloading from instance (auto-injected from session, or pass auth explicitly). Use from for local XML files, or omit to pull from instance. Use table (SDK v4.7.0+) to transform by table hierarchy, optionally with id to target a specific record and its relationships.';
  annotations = { openWorldHint: true };
  timeoutMs = 60_000;
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
      name: 'table',
      type: 'string',
      required: false,
      description: 'Comma-separated table names to transform by table hierarchy (SDK v4.7.0+). Combine with id to transform a specific record and its relationships.',
    },
    {
      name: 'id',
      type: 'string',
      required: false,
      description: 'sys_id of a specific record to transform (used with table, SDK v4.7.0+).',
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
      table: '--table',
      id: '--id',
    });
  }
}
