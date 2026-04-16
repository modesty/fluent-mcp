import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to download application metadata from a ServiceNow instance
 * Uses the session's working directory
 */
export class DownloadCommand extends SessionAwareCLICommand {
  name = 'download_fluent_app';
  description = 'Download application metadata from a ServiceNow instance into a local directory. Includes metadata deployed to the instance that may not exist locally. The directory argument specifies where to expand the application. Use incremental mode to download only changes since the last download. Requires instance authentication (auto-injected from session).';
  annotations = { openWorldHint: true };
  timeoutMs = 60_000;
  arguments: CommandArgument[] = [
    {
      name: 'directory',
      type: 'string',
      required: true,
      description: 'Path to expand application',
    },
    {
      name: 'source',
      type: 'string',
      required: false,
      description: 'Path to the directory that contains package.json configuration',
    },
    {
      name: 'incremental',
      type: 'boolean',
      required: false,
      description: 'Download application metadata from the instance in incremental mode',
    },
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    return this.executeSdkCommand(
      'download',
      args,
      {
        source: '--source',
        incremental: { flag: '--incremental', hasValue: false },
      },
      [args.directory as string]  // positional argument
    );
  }
}
