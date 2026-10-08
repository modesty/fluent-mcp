import { CommandArgument, CommandResult } from '../../utils/types.js';
import { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } from './sessionAwareCommand.js';
import {
  RESPONSE_TIMEOUT_ARGUMENT,
  runnerTimeoutForResponseTimeout,
  validateResponseTimeout,
} from './responseTimeout.js';

/**
 * Command to download application metadata from a ServiceNow instance
 * Uses the session's working directory
 */
export class DownloadCommand extends SessionAwareCLICommand {
  name = 'download_fluent_app';
  description = 'Download application metadata from a ServiceNow instance into a local directory. Includes metadata deployed to the instance that may not exist locally. The directory argument specifies where to expand the application. Use incremental mode to download only changes since the last download. For a large application, raise timeoutSeconds (SDK v4.13.0+). Requires instance authentication (auto-injected from session).';
  // Expands downloaded metadata into a local directory, overwriting existing files
  // there — flag as destructive so clients confirm before running.
  annotations = { openWorldHint: true, destructiveHint: true };
  // Full-app metadata downloads can be large. SDK v4.13.0 moved the download onto
  // a long-running dispatcher (3600 s idle budget), so the old 180 s cap killed
  // the child long before the CLI would give up; timeoutSeconds extends it further.
  timeoutMs = 600_000;
  arguments: CommandArgument[] = [
    WORKING_DIRECTORY_ARGUMENT,
    {
      name: 'auth',
      type: 'string',
      required: false,
      description: 'Credential alias to use for authentication with instance (auto-injected from session if not provided)',
    },
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
    RESPONSE_TIMEOUT_ARGUMENT,
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    }
  ];

  protected validateArgs(args: Record<string, unknown>): void {
    super.validateArgs(args);
    validateResponseTimeout(args);
  }

  protected resolveTimeoutMs(args: Record<string, unknown>): number {
    return runnerTimeoutForResponseTimeout(this.timeoutMs, args.timeoutSeconds);
  }

  async execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<CommandResult> {
    return this.executeSdkCommand(
      'download',
      args,
      {
        source: '--source',
        auth: '--auth',
        incremental: { flag: '--incremental', hasValue: false },
        timeoutSeconds: '--timeout',
      },
      [args.directory as string],  // positional argument
      signal
    );
  }
}
