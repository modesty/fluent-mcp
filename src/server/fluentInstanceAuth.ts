import logger from '../utils/logger.js';
import type { ToolsManager } from '../tools/toolsManager.js';
import { SessionManager } from '../utils/sessionManager.js';
import { CommandResult, CommandResultFactory } from '../utils/types.js';
import { AuthValidationResult } from '../types.js';
import { AuthProfile, parseAuthProfiles } from '../tools/commands/authCommand.js';
import { cliErrorMessage } from '../utils/cliError.js';
import {
  credentialStoreRecoveryGuidance,
  resolveCredentialsDir,
  sanitizeCredentialStoreMessage,
} from '../utils/credentialStore.js';

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
 * 2. Read the stored auth profiles through the bundled SDK's credential API
 *    (`AuthCommand`: structured JSON, never the human `auth --list` text).
 *    The server only reads the profile store.
 *    - If a profile's host matches SN_INSTANCE_URL and its alias has no control
 *      characters -> store its alias in the session; every instance command
 *      passes it per call (`--auth`), so the CLI's default profile is never switched
 *    - If only control-character aliases match -> validation_error
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
      // The reader exits 0 even with no profiles, so a non-zero exit means the
      // profile store itself could not be read — e.g. the SDK v4.14.0+ encrypted
      // store (credentials.enc) cannot be decrypted. Report that instead of
      // treating it as "no matching profile".
      const failure = describeAuthListFailure(listRes);
      const displayFailure = sanitizeCredentialStoreMessage(failure).trim();
      logger.warn('Auto-auth failed: could not list auth profiles', { error: displayFailure });
      return createResult({
        status: 'validation_error',
        host,
        authType,
        message: `Auth validation failed: could not list auth profiles: ${displayFailure}`,
        actionRequired: credentialStoreAction(failure, buildAuthCommand(instUrl, authType, deriveAliasFromInstance(instUrl))),
        timestamp,
      });
    }
    const profiles = parseAuthProfiles(listRes.output);
    if (!profiles) {
      logger.warn('Auto-auth failed: the profile reader returned no well-formed listing', { host });
      return createResult({
        status: 'validation_error',
        host,
        authType,
        message: 'Auth validation failed: the bundled SDK returned no well-formed auth profile listing.',
        actionRequired:
          'Reinstall fluent-mcp so its bundled @servicenow/sdk is complete, then restart this MCP server. ' +
          "Until then, pass 'auth' with a stored profile alias on each call.",
        timestamp,
      });
    }

    // A session alias is injected after argument validation, so it must meet the
    // contract an explicit `auth` argument does: no control characters. Such an
    // alias also could not be shown safely in a message or log.
    const matching = profiles.filter((p) => urlsEqual(p.host, instUrl));
    const matched = matching.find((p) => isPlainAlias(p.alias));
    if (matched) {
      // Found a matching profile: store its alias in the session. Every
      // instance command passes it per call (`--auth`), so the CLI's default
      // profile, which other `now-sdk` runs on this machine use, is never
      // switched here: even a status check used to redirect them (W9 review).
      sessionManager.setAuthAlias(matched.alias);
      logger.debug('Auto-auth validated: matching profile found', { alias: matched.alias, isDefault: matched.isDefault });
      return createResult({
        status: 'authenticated',
        alias: matched.alias,
        host,
        authType: matched.type || authType,
        isDefault: matched.isDefault,
        message: matched.isDefault
          ? 'Auto-auth validated: default profile matches SN_INSTANCE_URL'
          : `Auto-auth validated: profile ${matched.alias} matches SN_INSTANCE_URL; it is passed per call, and the CLI default profile is unchanged`,
        timestamp,
      });
    }
    if (matching.length > 0) {
      logger.warn('Auto-auth rejected: matching profile alias contains control or escape characters', { host });
      return createResult(manualSetupResult({
        instUrl,
        authType,
        host,
        timestamp,
        profiles,
        status: 'validation_error',
        lead:
          `A stored auth profile matches ${host}, but its alias contains control or escape characters and cannot be safely auto-selected. ` +
          'Add a plain-text alias for this instance in a terminal, then restart this MCP server.',
      }));
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

/** Control characters (including ESC), which the `auth` argument contract excludes. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F]/;

/** True for an alias that can be passed as `--auth` and shown in a message. */
function isPlainAlias(alias: string): boolean {
  return alias.length > 0 && !CONTROL_CHARS.test(alias);
}

/** What the validation that found no usable matching profile knows. */
interface ManualSetupContext {
  instUrl: string;
  authType: string;
  host: string;
  timestamp: string;
  /** Every stored profile the reader returned. */
  profiles: AuthProfile[];
  /** Validation status (`not_authenticated` when absent, `validation_error` when an alias was rejected). */
  status?: 'not_authenticated' | 'validation_error';
  /** Opening sentence explaining why a profile must be added in a terminal. */
  lead?: string;
}

/**
 * The manual-setup result when no usable stored profile matches SN_INSTANCE_URL:
 * the command that adds one in a terminal (with credential-store settings when
 * customized or env-backed), and what that command does to the CLI default.
 */
function manualSetupResult({
  instUrl,
  authType,
  host,
  timestamp,
  profiles,
  status = 'not_authenticated',
  lead = `No auth profile matches ${host}. The server does not add profiles; add one in a terminal with the command below.`,
}: ManualSetupContext): AuthValidationResult {
  const derivedAlias = deriveAliasFromInstance(instUrl);
  // `auth --add` replaces a profile stored under the same alias. A profile with
  // the derived alias names another host here (a matching one would have been
  // used), so the command asks for another alias instead of replacing it.
  const aliasTaken = profiles.some((profile) => profile.alias === derivedAlias);
  const rawPreviousDefault = profiles.find((profile) => profile.isDefault)?.alias;
  const previousDefault = rawPreviousDefault && isPlainAlias(rawPreviousDefault) ? rawPreviousDefault : undefined;
  const envKeySource = process.env.SN_SDK_KEY_SOURCE === 'env';
  const hasEnvKey = Boolean(process.env.SN_SDK_ENCRYPTION_KEY?.trim());
  const customCredDir = resolveCredentialsDir();
  const addCommand = buildAuthCommand(instUrl, authType, aliasTaken ? '<new alias>' : derivedAlias);

  const message = [
    lead,
    aliasTaken &&
      `The alias ${derivedAlias} belongs to a profile for another host, which adding under it would replace, so choose another alias.`,
    previousDefault
      ? `auth --add makes the new profile the CLI default for every now-sdk run on this machine; run npx @servicenow/sdk auth --use ${previousDefault} afterwards to keep ${previousDefault} as the default.`
      : rawPreviousDefault &&
        'auth --add makes the new profile the CLI default for every now-sdk run on this machine.',
    customCredDir &&
      `This MCP server reads credentials from ${customCredDir}; set SN_SDK_CREDENTIALS_DIR=${customCredDir} in your terminal before running auth --add so the profile is written to the same store.`,
    envKeySource && !hasEnvKey &&
      'SN_SDK_KEY_SOURCE=env is set without SN_SDK_ENCRYPTION_KEY, so the first auth --add will fail until a key is configured. ' +
      "Generate a base64-encoded 32-byte key and configure SN_SDK_KEY_SOURCE=env and that same SN_SDK_ENCRYPTION_KEY in both your terminal and this MCP server's environment before adding the first profile, then restart this MCP server.",
    envKeySource && hasEnvKey &&
      'Because SN_SDK_KEY_SOURCE=env is active, run auth --add in a terminal configured with the same SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY, then restart this MCP server.',
  ].filter(Boolean).join(' ');

  const dirClause = customCredDir ? ` with SN_SDK_CREDENTIALS_DIR=${customCredDir}` : '';
  const envSettings = [
    customCredDir && `SN_SDK_CREDENTIALS_DIR=${customCredDir}`,
    envKeySource && 'SN_SDK_KEY_SOURCE=env and the same SN_SDK_ENCRYPTION_KEY',
  ].filter(Boolean).join(' and ');
  const actionRequired = envKeySource && !hasEnvKey
    ? 'Generate a base64-encoded 32-byte key, configure SN_SDK_KEY_SOURCE=env and the same SN_SDK_ENCRYPTION_KEY in both your ' +
      `terminal and this MCP server's environment${dirClause}, run '${addCommand}' in that terminal, then restart this MCP server.`
    : envSettings
      ? `Set ${envSettings} in your terminal, run '${addCommand}', then restart this MCP server.`
      : addCommand;

  return {
    status,
    host,
    authType,
    message,
    actionRequired,
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
 * The SDK's own message for a failed profile read: the reader's `ok: false`
 * envelope on stdout. A reader that died before writing one (e.g. a module the
 * bundled SDK no longer has) leaves its error on stderr, which the executor
 * already extracted into `error`; the executor's credential-store guidance is
 * not taken from there, because `credentialStoreAction` adds its own.
 */
function describeAuthListFailure(result: CommandResult): string {
  return cliErrorMessage(result.output, '') ?? result.error?.message ??
    (result.output.trim() || 'the auth profile reader exited with an error and no output');
}

/** The next step for a failed profile read: its store rule's fix, else the add command. */
function credentialStoreAction(failure: string, addCommand: string): string {
  return credentialStoreRecoveryGuidance(failure, addCommand) ?? addCommand;
}

