import { CommandArgument, CommandResult } from '../../utils/types.js';
import { BaseCLICommand, DEBUG_ARGUMENT } from './baseCommand.js';

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
    DEBUG_ARGUMENT,
  ];

  async execute(args: Record<string, unknown> = {}): Promise<CommandResult> {
    this.validateArgs(args);
    // Auth profiles are global SDK state, not Fluent-project state; runBundledSdk
    // uses the installed package directory as a neutral cwd.
    return this.runBundledSdk(args, {
      subcommand: 'auth',
      fixedFlags: ['--list'],
    });
  }
}
