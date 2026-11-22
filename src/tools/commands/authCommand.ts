import { CommandArgument, CommandResult } from '../../utils/types.js';
import { BaseCLICommand } from './baseCommand.js';
import { resolveSdkCli } from '../../utils/sdkCli.js';
import { getProjectRootPath } from '../../config.js';
import { parseCliEnvelope } from '../../utils/cliEnvelope.js';

/** One stored auth profile, as the SDK's credential API reports it (no secrets). */
export interface AuthProfile {
  alias: string;
  host?: string;
  type?: string;
  isDefault: boolean;
}

/**
 * The child script that reads the profile store through the SDK's own API.
 *
 * `now-sdk auth --list` prints aliases and field values unescaped, so a newline
 * in an alias or username can forge a profile header; no text parser can tell
 * those apart. This calls sdk-cli `fetchCredentials()`, the function `auth --list`
 * prints from, and writes one JSON envelope line instead. `fetchCredentials()`
 * returns previews only (alias, instanceUrl, type, isDefault, username), and
 * the script forwards no username. It runs in a child, not in this process,
 * because the SDK logger writes to stdout, which is the MCP stdio channel here;
 * in the child the logger is moved to stderr, so stdout carries only the
 * envelope (plus an `LOG_LEVEL` notice the logger prints while loading, which
 * `parseCliEnvelope` skips by reading the last line).
 *
 * `process.argv[1]` is the bundled `@servicenow/sdk` bin path: resolving from it
 * finds the same `@servicenow/sdk-cli` that `now-sdk` itself loads. sdk-cli has
 * no `exports` map, so its `dist/` paths resolve; if a future SDK adds one, the
 * read fails closed with the resolution error.
 *
 * A non-TTY stdout makes the SDK throw instead of prompting for a reset of an
 * unreadable store, and the thrown message is the one `auth --list` would log,
 * so the credential-store recovery rules match it unchanged. The script exits
 * once the envelope is flushed, so a handle the SDK leaves open (keyring,
 * timers) cannot hold the child until the runner's timeout.
 */
export const LIST_PROFILES_SCRIPT = `'use strict';
const reply = (envelope, code) => process.stdout.write(JSON.stringify(envelope) + '\\n', () => process.exit(code));
(async () => {
  const sdkRequire = require('node:module').createRequire(process.argv[1]);
  sdkRequire('@servicenow/sdk-cli/dist/logger/index.js').logger.setStream('stderr');
  const { fetchCredentials } = sdkRequire('@servicenow/sdk-cli/dist/auth/index.js');
  const profiles = [];
  for (const [alias, creds] of await fetchCredentials()) {
    profiles.push({ alias, host: creds.instanceUrl, type: creds.type, isDefault: creds.isDefault === true });
  }
  reply({ ok: true, profiles }, 0);
})().catch((e) => {
  const message = e instanceof Error
    ? (e.cause instanceof Error ? e.message + '\\n  Caused by: ' + e.cause.message : e.message)
    : String(e);
  reply({ ok: false, error: { message } }, 1);
});`;

const optionalString = (value: unknown): value is string | undefined => value === undefined || typeof value === 'string';

/**
 * The profiles in a successful {@link LIST_PROFILES_SCRIPT} run, or `undefined`
 * when the output is not a well-formed `ok: true` envelope. Any malformed entry
 * rejects the whole listing, so a partial read is never used.
 */
export function parseAuthProfiles(output: string): AuthProfile[] | undefined {
  const envelope = parseCliEnvelope(output);
  if (envelope?.ok !== true || !Array.isArray(envelope.profiles)) return undefined;
  const profiles: AuthProfile[] = [];
  for (const entry of envelope.profiles as unknown[]) {
    if (typeof entry !== 'object' || entry === null) return undefined;
    const { alias, host, type, isDefault } = entry as Record<string, unknown>;
    if (typeof alias !== 'string' || !optionalString(host) || !optionalString(type) || typeof isDefault !== 'boolean') {
      return undefined;
    }
    profiles.push({ alias, host, type, isDefault });
  }
  return profiles;
}

/**
 * Reads the SDK's stored auth profiles for lazy auth validation (see
 * {@link LIST_PROFILES_SCRIPT}). Internal: not exposed to MCP clients.
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
  arguments: CommandArgument[] = [];

  async execute(args: Record<string, unknown> = {}): Promise<CommandResult> {
    this.validateArgs(args);
    const { command, baseArgs } = resolveSdkCli();
    // Auth profiles are global SDK state, not Fluent-project state, so the
    // installed package directory is a neutral cwd.
    return this.commandProcessor.process(
      command,
      ['-e', LIST_PROFILES_SCRIPT, baseArgs[0]],
      getProjectRootPath(),
      this.timeoutMs
    );
  }
}
