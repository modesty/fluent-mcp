import logger from '../utils/logger.js';
import type { ToolsManager } from '../tools/toolsManager.js';
import { SessionManager } from '../utils/sessionManager.js';
import { CommandResultFactory } from '../utils/types.js';
import { AuthValidationResult } from '../types.js';
import { cliErrorMessage } from '../utils/cliError.js';

/**
 * Log an auth validation result to stderr at the severity its status carries.
 * Only the allow-listed fields are included, so credentials can never leak
 * through an auth result.
 */
export function logAuthValidationResult(result: AuthValidationResult): void {
  const context: Record<string, unknown> = {
    status: result.status,
    timestamp: result.timestamp,
  };
  if (result.alias) context.alias = result.alias;
  if (result.host) context.host = result.host;
  if (result.authType) context.authType = result.authType;
  if (result.isDefault !== undefined) context.isDefault = result.isDefault;
  if (result.actionRequired) context.actionRequired = result.actionRequired;

  switch (result.status) {
    case 'authenticated':
      logger.info(result.message, context);
      break;
    case 'skipped':
      logger.debug(result.message, context);
      break;
    case 'not_authenticated':
      logger.notice(result.message, context);
      break;
    case 'validation_error':
      logger.warn(result.message, context);
      break;
  }
}

/**
 * Perform auto-authentication validation if environment is configured
 *
 * Environment variables:
 * - SN_INSTANCE_URL: ServiceNow instance URL (required for auto-auth)
 * - SN_AUTH_TYPE: Authentication type ('basic' or 'oauth', defaults to 'oauth'),
 *   used in the command that adds a profile by hand
 *
 * Rules:
 * 1. If SN_INSTANCE_URL is not set -> return skipped status
 * 2. List the stored auth profiles via the bundled SDK CLI (`auth --list`).
 *    The server only reads the profile store.
 *    - If a profile's host matches SN_INSTANCE_URL -> store its alias in the
 *      session; every instance command passes it per call (`--auth`), so the
 *      CLI's default profile is never switched
 * 3. If no profile matches -> not_authenticated with the command that adds one
 *    in a terminal. The server never adds a profile: `auth --add` makes it the
 *    CLI default for every now-sdk run on the machine, and setting the previous
 *    default back cannot be made safe. A failure after the write skips the
 *    restore, and validations that overlap in separate server processes
 *    restore the wrong default (W9 review).
 *
 * @returns AuthValidationResult with structured auth status, also stored in the session
 */
export async function autoValidateAuthIfConfigured(toolsManager: ToolsManager): Promise<AuthValidationResult> {
  const instUrl = process.env.SN_INSTANCE_URL?.trim();
  const authType = process.env.SN_AUTH_TYPE?.trim() || 'oauth';
  const sessionManager = SessionManager.getInstance();
  const timestamp = new Date().toISOString();

  // Helper to create result and store in session
  const createResult = (result: AuthValidationResult): AuthValidationResult => {
    sessionManager.setAuthValidationResult(result);
    return result;
  };

  if (!instUrl) {
    logger.debug('Auto-auth skipped: SN_INSTANCE_URL is not set');
    return createResult({
      status: 'skipped',
      message: 'Auto-auth skipped: SN_INSTANCE_URL environment variable is not set',
      timestamp,
    });
  }

  // Extract hostname for display (no credentials)
  const host = extractHostname(instUrl);

  try {
    const listRes = await toolsManager.listAuthProfiles();
    if (listRes.exitCode !== 0) {
      // `auth --list` exits 0 even with no profiles ("No credentials found"), so a
      // non-zero exit means the profile store itself could not be read — e.g. the
      // SDK v4.14.0+ encrypted store (credentials.enc) cannot be decrypted. Report
      // that instead of treating it as "no matching profile".
      const failure = describeAuthListFailure(listRes.output);
      logger.warn('Auto-auth failed: could not list auth profiles', { error: failure });
      return createResult({
        status: 'validation_error',
        host,
        authType,
        message: `Auth validation failed: could not list auth profiles: ${failure}`,
        actionRequired: credentialStoreAction(failure, buildAuthCommand(instUrl, authType, deriveAliasFromInstance(instUrl))),
        timestamp,
      });
    }
    const profiles = parseAuthListOutput(listRes.output);

    const matched = profiles.find((p) => urlsEqual(p.host, instUrl));
    if (matched) {
      // Found a matching profile: store its alias in the session. Every
      // instance command passes it per call (`--auth`), so the CLI's default
      // profile, which other `now-sdk` runs on this machine use, is never
      // switched here: even a status check used to redirect them (W9 review).
      sessionManager.setAuthAlias(matched.alias);
      logger.debug('Auto-auth validated: matching profile found', { alias: matched.alias, isDefault: matched.defaultYes });
      return createResult({
        status: 'authenticated',
        alias: matched.alias,
        host,
        authType: matched.type || authType,
        isDefault: matched.defaultYes,
        message: matched.defaultYes
          ? 'Auto-auth validated: default profile matches SN_INSTANCE_URL'
          : `Auto-auth validated: profile ${matched.alias} matches SN_INSTANCE_URL; it is passed per call, and the CLI default profile is unchanged`,
        timestamp,
      });
    }

    logger.debug('No auth profile matches SN_INSTANCE_URL; a profile must be added by hand', { host, authType });
    return createResult(manualSetupResult({ instUrl, authType, host, timestamp, profiles }));
  } catch (error) {
    const alias = deriveAliasFromInstance(instUrl);
    const authCommand = buildAuthCommand(instUrl, authType, alias);
    const errorMessage = CommandResultFactory.normalizeError(error).message;

    logger.warn('Auto-auth failed to validate', { error: errorMessage });

    return createResult({
      status: 'validation_error',
      host,
      authType,
      message: `Auth validation failed: ${errorMessage}`,
      actionRequired: authCommand,
      timestamp,
    });
  }
}

/** One profile from `now-sdk auth --list`. */
interface AuthProfile {
  alias: string;
  host?: string;
  type?: string;
  defaultYes: boolean;
}

/** What the validation that found no matching profile knows. */
interface ManualSetupContext {
  instUrl: string;
  authType: string;
  host: string;
  timestamp: string;
  /** The profiles `auth --list` returned, none of which matches `instUrl`. */
  profiles: AuthProfile[];
}

/**
 * The not_authenticated result when no stored profile matches SN_INSTANCE_URL:
 * the command that adds one in a terminal, and what that command does to the
 * user's other profiles.
 */
function manualSetupResult({ instUrl, authType, host, timestamp, profiles }: ManualSetupContext): AuthValidationResult {
  const derivedAlias = deriveAliasFromInstance(instUrl);
  // `auth --add` replaces a profile stored under the same alias. A profile with
  // the derived alias names another host here (a matching one would have been
  // used), so the command asks for another alias instead of replacing it.
  const aliasTaken = profiles.some((profile) => profile.alias === derivedAlias);
  const previousDefault = profiles.find((profile) => profile.defaultYes)?.alias;

  const message = [
    `No auth profile matches ${host}. The server does not add profiles; add one in a terminal with the command below.`,
    aliasTaken &&
      `The alias ${derivedAlias} belongs to a profile for another host, which adding under it would replace, so choose another alias.`,
    previousDefault &&
      `auth --add makes the new profile the CLI default for every now-sdk run on this machine; run npx @servicenow/sdk auth --use ${previousDefault} afterwards to keep ${previousDefault} as the default.`,
  ].filter(Boolean).join(' ');

  return {
    status: 'not_authenticated',
    host,
    authType,
    message,
    actionRequired: buildAuthCommand(instUrl, authType, aliasTaken ? '<new alias>' : derivedAlias),
    timestamp,
  };
}

/**
 * Build the auth command string for display to the user
 */
function buildAuthCommand(instUrl: string, authType: string, alias: string): string {
  return `npx @servicenow/sdk auth --add ${instUrl} --type ${authType} --alias ${alias}`;
}

/**
 * Extract hostname from URL for safe display (no credentials)
 */
function extractHostname(instUrl: string): string {
  try {
    const u = new URL(instUrl);
    return u.hostname;
  } catch {
    // If URL parsing fails, return sanitized string
    return instUrl.replace(/^https?:\/\//, '').split('/')[0];
  }
}

/** Normalize and compare two URLs/hosts for equality (ignores trailing slashes) */
function urlsEqual(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const na = a.trim().replace(/\/?$/, '');
  const nb = b.trim().replace(/\/?$/, '');
  return na === nb;
}

/** Derive a reasonable alias name from SN_INSTANCE_URL or raw value */
function deriveAliasFromInstance(instUrl: string): string {
  try {
    const u = new URL(instUrl);
    // Use hostname if available; fallback to sanitized string
    return u.hostname || instUrl.replace(/\W+/g, '-');
  } catch {
    return instUrl.replace(/\W+/g, '-');
  }
}

/**
 * The CLI logs failures as `[now-sdk] ERROR: <message>` on stdout. Return those
 * messages (or the trimmed output when none are tagged) for the validation result.
 */
function describeAuthListFailure(output: string): string {
  return cliErrorMessage(output, '') ?? (output.trim() || 'now-sdk auth --list exited with an error and no output');
}

/** A credential-store failure `auth --list` can report, and what fixes it. */
interface CredentialStoreRule {
  /** Matches the CLI's own message (sdk-cli `auth/credential-store/`). Case-sensitive. */
  pattern: RegExp;
  /** The next step, given the add command for the configured instance. */
  action: (addCommand: string) => string;
}

/**
 * The now-sdk child inherits this server's environment, so an env-key fix belongs in the
 * MCP client's env configuration for this server, and takes effect on restart.
 */
const SERVER_ENV = "in this MCP server's environment (the env block of its client configuration), then restart the server";
const KEEP_STORE = 'Do not reset the stored credentials.';

/**
 * The SDK v4.14.0+ credential store (`credentials.enc` + a key from the OS keyring or, as
 * of SDK v4.14.2, `SN_SDK_ENCRYPTION_KEY`) fails in distinct ways, and only one of them is
 * recovered by a reset: the CLI's non-TTY "could not be read" message (`index.js`), which also
 * covers a truncated or corrupted file. Every other failure keeps data a reset would destroy:
 * a file written by a newer now-sdk, the legacy keychain entry older SDK installs still read
 * (keyring write failure during migration), or credentials the right env key can still decrypt.
 * So each maps to its own fix, and an unrecognized failure falls back to the add command.
 */
const CREDENTIAL_STORE_RULES: readonly CredentialStoreRule[] = [
  {
    pattern: /Stored credentials at .+ could not be read/,
    action: (addCommand) => `Run 'now-sdk auth --delete all' in a terminal, then add the profile again: ${addCommand}`,
  },
  {
    // file-store.js UnsupportedFormatVersionError
    pattern: /Stored credentials were written in format version \d+/,
    action: () =>
      `${KEEP_STORE} A newer now-sdk wrote them; upgrade fluent-mcp to a release that bundles that now-sdk version or later.`,
  },
  {
    // key-provider.js OsKeyringProvider.setKey (migration from the legacy keychain entry)
    pattern: /Could not write the credential encryption key to the OS keyring/,
    action: () =>
      `${KEEP_STORE} Unlock the OS keyring and retry, or set SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY ` +
      `(a base64-encoded 32-byte key) ${SERVER_ENV}.`,
  },
  {
    // index.js externalKeyMissingError (SN_SDK_KEY_SOURCE=env)
    pattern: /SN_SDK_ENCRYPTION_KEY is not set, but encrypted credentials exist/,
    action: () => `Set SN_SDK_ENCRYPTION_KEY to the key the stored credentials were encrypted with ${SERVER_ENV}. ${KEEP_STORE}`,
  },
  {
    // index.js read(): an env key that does not decrypt the file
    pattern: /Could not decrypt the stored credentials at .+ with SN_SDK_ENCRYPTION_KEY/,
    action: () => `Set SN_SDK_ENCRYPTION_KEY to the original key ${SERVER_ENV}. ${KEEP_STORE}`,
  },
  {
    // key-provider.js EnvVarKeyProvider.getKey
    pattern: /SN_SDK_ENCRYPTION_KEY must be a base64-encoded 32-byte key/,
    action: () =>
      `Set SN_SDK_ENCRYPTION_KEY to the base64-encoded 32-byte key the stored credentials were encrypted with ${SERVER_ENV}. ${KEEP_STORE}`,
  },
  {
    // key-provider.js getActiveKeyProvider
    pattern: /Unknown SN_SDK_KEY_SOURCE /,
    action: () => `Set SN_SDK_KEY_SOURCE to keyring or env, or unset it to use the OS keyring, ${SERVER_ENV}.`,
  },
];

/** The next step for an `auth --list` failure: its store rule's fix, else the add command. */
function credentialStoreAction(failure: string, addCommand: string): string {
  const rule = CREDENTIAL_STORE_RULES.find(({ pattern }) => pattern.test(failure));
  return rule ? rule.action(addCommand) : addCommand;
}

/** Parse `now-sdk auth --list` stdout into profiles */
function parseAuthListOutput(stdout: string): AuthProfile[] {
  const profiles: AuthProfile[] = [];
  if (!stdout) return profiles;

  const lines = stdout.split(/\r?\n/);
  let current: AuthProfile | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    // A profile header is alone on its line (`*[alias]` / `[alias]`), which keeps
    // CLI log lines such as `[now-sdk] Listing all credentials:` from parsing as one.
    // Hardening: current output prints log lines only before the profiles, where a
    // bogus `now-sdk` profile had no fields and was harmless.
    const headerMatch = line.trim().match(/^\*?\[([^\]]+)\]$/);
    if (headerMatch) {
      if (current) profiles.push(current);
      // Mark default if the header starts with '*'
      const isDefault = line.trimStart().startsWith('*');
      current = { alias: headerMatch[1], defaultYes: isDefault };
      continue;
    }
    const kvMatch = line.match(/^\s*([a-zA-Z_]+)\s*=\s*(.*)$/);
    if (kvMatch && current) {
      const key = kvMatch[1].toLowerCase();
      const value = kvMatch[2].trim();
      if (key === 'host') current.host = value;
      else if (key === 'type') current.type = value;
      else if (key === 'default') current.defaultYes = /^yes$/i.test(value);
    }
  }
  if (current) profiles.push(current);
  return profiles;
}
