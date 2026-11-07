import { CommandArgument, CommandResult } from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { getProjectRootPath } from '../../config.js';

/**
 * Lists the CLI's stored auth profiles (`now-sdk auth --list`) for lazy auth
 * validation. Internal: not exposed to MCP clients.
 *
 * Deliberately read-only. The profile store and its default profile are global
 * state that every `now-sdk` run on the machine shares: `auth --add` always makes
 * the new profile the default (sdk-cli `storeCredentials(alias, cred, true)`),
 * and setting the previous default back cannot be made safe. A failure between
 * the two writes skips it, and two validations that overlap restore the wrong
 * default (W9 review). So the server never adds, deletes or selects a profile;
 * the user does that in a terminal.
 */
export class AuthCommand extends BaseCLICommand {
  name = 'list_fluent_auth_profiles';
  description = 'List the ServiceNow SDK auth profiles stored on this machine (read-only)';
  arguments: CommandArgument[] = [
    {
      name: 'debug',
      type: 'boolean',
      required: false,
      description: 'Print debug output',
    },
  ];

  async execute(args: Record<string, unknown> = {}, signal?: AbortSignal): Promise<CommandResult> {
    this.validateArgs(args);

    // Resolve the bundled SDK CLI so this works from any cwd.
    const { command, baseArgs } = resolveSdkCli();
    const sdkArgs = [...baseArgs, 'auth', '--list'];
    this.appendCommonFlags(sdkArgs, args);

    // Auth profiles are global SDK state, not Fluent-project state. The package
    // directory is an intentional neutral cwd for the bundled CLI.
    return await this.commandProcessor.process(
      command,
      sdkArgs,
      getProjectRootPath(),
      undefined,
      undefined,
      signal
    );
  }
}
