import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand } from './sessionAwareCommand.js';

/**
 * Command to download application metadata from a ServiceNow instance
 * Uses the session's working directory
 */
export class DownloadCommand extends SessionAwareCLICommand {
  name = 'download_fluent_app';
  description = 'Download application metadata from instance, including metadata that not exist in local but deployed to instance';
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
    const sdkArgs = ['now-sdk', 'download', args.directory as string];

    if (args.source) {
      sdkArgs.push('--source', args.source as string);
    }
    if (args.incremental) {
      sdkArgs.push('--incremental');
    }
    this.appendCommonFlags(sdkArgs, args);

    return this.executeWithSessionWorkingDirectory('npx', sdkArgs);
  }
}
