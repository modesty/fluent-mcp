import os from 'node:os';
import path from 'node:path';
import { parseCliEnvelope } from './cliEnvelope.js';

/**
 * The server's launch directory, captured once at startup so a relative
 * `SN_SDK_CREDENTIALS_DIR` resolves to one stable absolute path across the
 * server's lifetime (auth validation, every child process regardless of its
 * project `cwd`, and generated terminal commands).
 */
const SERVER_START_CWD = process.cwd();

/**
 * Resolve `SN_SDK_CREDENTIALS_DIR` (when non-empty) to an absolute path once
 * against the server's launch directory. Returns `undefined` when unset or
 * empty (matching the SDK CLI's `process.env['SN_SDK_CREDENTIALS_DIR'] || ...`
 * default to `~/.now-sdk`).
 */
export function resolveCredentialsDir(
  env: Record<string, string | undefined> = process.env,
  baseDir: string = SERVER_START_CWD
): string | undefined {
  const raw = env.SN_SDK_CREDENTIALS_DIR;
  if (!raw) return undefined;
  return resolveSdkStorePath(raw, baseDir);
}

/**
 * Resolve the effective credential-store directory the SDK CLI uses in this
 * server's environment: the resolved `SN_SDK_CREDENTIALS_DIR` when configured,
 * else the SDK default (`~/.now-sdk`).
 */
export function resolveEffectiveCredentialsDir(
  env: Record<string, string | undefined> = process.env,
  baseDir: string = SERVER_START_CWD,
  homeDir: string = os.homedir()
): string {
  return resolveCredentialsDir(env, baseDir) ?? path.join(homeDir, '.now-sdk');
}

/**
 * Resolve a credential store path reported by the SDK CLI to an absolute path.
 * On Windows a rooted path such as `\profiles` still needs the launch drive.
 */
export function resolveSdkStorePath(storePath: string, baseDir: string = SERVER_START_CWD): string {
  return path.resolve(baseDir, storePath);
}

/** Matches the SDK v4.14.0+ non-TTY unreadable-store error and captures the store file path. */
const UNREADABLE_STORE_PATTERN = /^Stored credentials at (.+?) could not be read/;

/**
 * Strip the SDK CLI's destructive deletion/reset imperatives from recognized
 * credential-store error messages and normalize any relative store path to an
 * absolute path. Pure text rewrite; callers handling machine-mode JSON output
 * should use {@link recoverCredentialStoreFailure} so JSON escaping stays valid.
 */
export function sanitizeCredentialStoreMessage(text: string, baseDir: string = SERVER_START_CWD): string {
  return text
    .replace(
      /Stored credentials at (.+?) could not be read\.?(?:\s*Run 'now-sdk auth --delete all'[^.]*\.?)?/g,
      (_match, storePath: string) => `Stored credentials at ${resolveSdkStorePath(storePath, baseDir)} could not be read.`
    )
    .replace(
      /Stored credentials at (.+?) were not reset\.?(?:\s*Re-run the command to try again, or run 'now-sdk auth --delete all'[^.]*\.?)?/g,
      (_match, storePath: string) => `Stored credentials at ${resolveSdkStorePath(storePath, baseDir)} were not reset.`
    )
    .replace(
      /Could not decrypt the stored credentials at (.+?) with SN_SDK_ENCRYPTION_KEY:[^.]*\.(?:\s*The stored credentials were not reset\.)?(?:\s*Set SN_SDK_ENCRYPTION_KEY[^.]*\.)?/g,
      (_match, storePath: string) =>
        `Could not decrypt the stored credentials at ${resolveSdkStorePath(storePath, baseDir)} with SN_SDK_ENCRYPTION_KEY: ` +
        "the key doesn't match, or the file is corrupted. The stored credentials were not reset."
    )
    // Anchor on the sentence boundary (". Set it to the key" or end-of-line),
    // NOT the first ".", so paths containing "../" or ".now-sdk" stay intact.
    .replace(
      /SN_SDK_ENCRYPTION_KEY is not set, but encrypted credentials exist at (.+?)\.(?=\s+Set it to the key|\s*$)/gm,
      (_match, storePath: string) =>
        `SN_SDK_ENCRYPTION_KEY is not set, but encrypted credentials exist at ${resolveSdkStorePath(storePath, baseDir)}.`
    )
    .replace(
      /Stored credentials at (.+?) are truncated or corrupted\./g,
      (_match, storePath: string) =>
        `Stored credentials at ${resolveSdkStorePath(storePath, baseDir)} are truncated or corrupted.`
    );
}

/** A credential-store failure the SDK CLI can report, and what safely recovers it. */
interface CredentialStoreRule {
  /** Matches the CLI's own message (sdk-cli `auth/credential-store/`). Case-sensitive. */
  pattern: RegExp;
  /** Safe recovery steps for the matched failure. */
  action: (addCommand: string, failure: string, baseDir: string) => string;
}

/**
 * The now-sdk child inherits this server's environment, so an env-key fix belongs in the
 * MCP client's env configuration for this server, and takes effect on restart.
 */
const SERVER_ENV = "in this MCP server's environment (the env block of its client configuration), then restart the server";
const KEEP_STORE = 'Do not reset the stored credentials.';
const RESTORE_KEYRING = `If the original store used the OS keyring, unlock that keyring and set SN_SDK_KEY_SOURCE=keyring ${SERVER_ENV}.`;
const DEFAULT_ADD_COMMAND = 'npx @servicenow/sdk auth --add <instance-url>';

/**
 * The SDK v4.14.0+ credential store (`credentials.enc` + a key from the OS keyring or, as
 * of SDK v4.14.2, `SN_SDK_ENCRYPTION_KEY`) fails in distinct ways where a blind reset would
 * destroy recoverable profiles:
 * - The CLI's non-TTY "could not be read" message (`index.js`) fires not only on corruption
 *   but also when credentials were created under `SN_SDK_KEY_SOURCE=env` and this server runs
 *   with the default keyring provider, when `SN_SDK_CREDENTIALS_DIR` differs, or when the OS
 *   keyring is locked — so verify store directory, key source, and keyring first and treat
 *   reset as a last resort (after confirming the terminal targets the reported file path and
 *   understanding that `auth --delete all` also deletes the shared OS keyring key and legacy
 *   keychain entry).
 * - A keyring write failure during migration deletes the partial `credentials.enc` and leaves
 *   the legacy keychain entry intact; switching to `SN_SDK_KEY_SOURCE=env` does not migrate
 *   that legacy entry (the CLI sees no encrypted file and returns empty before checking the
 *   legacy keychain), and ToolsManager caches validation per server process — so callers must
 *   restart the server after unlocking the keyring or finishing profile setup.
 * - Every other failure keeps data a reset would destroy (newer format version, missing/wrong/
 *   malformed env key, unknown key source).
 */
const CREDENTIAL_STORE_RULES: readonly CredentialStoreRule[] = [
  {
    pattern: UNREADABLE_STORE_PATTERN,
    action: (addCommand, failure, baseDir) => {
      const rawPath = UNREADABLE_STORE_PATTERN.exec(failure)?.[1];
      const resolvedFile = rawPath ? resolveSdkStorePath(rawPath, baseDir) : undefined;
      const resolvedDir = resolvedFile ? path.dirname(resolvedFile) : undefined;
      const pathNote = resolvedFile ? ` (${resolvedFile})` : '';
      const dirHint = resolvedDir
        ? ` (set SN_SDK_CREDENTIALS_DIR=${resolvedDir} in the terminal if it differs from the default)`
        : ' (set SN_SDK_CREDENTIALS_DIR in the terminal if the MCP client uses a custom directory)';
      return (
        'Verify SN_SDK_CREDENTIALS_DIR (if customized) and that the MCP server account has read permission on the file ' +
        'and traversal permission on its parent directories. Check whether these credentials were created with ' +
        `SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY (if so, set both ${SERVER_ENV}), and ensure the OS ` +
        'keyring is unlocked and accessible (then restart this MCP server and check auth status again). ' +
        `Only as a last resort: first confirm your terminal resolves the reported file path${pathNote}${dirHint}, ` +
        "and note that 'now-sdk auth --delete all' removes credentials.enc in that directory plus the shared OS " +
        'keyring key and legacy keychain entry (which can strand credentials outside that directory). ' +
        `If you still want to reset, run 'now-sdk auth --delete all' in that terminal, add the profile again (${addCommand}), ` +
        'and restart this MCP server.'
      );
    },
  },
  {
    // file-store.js UnsupportedFormatVersionError
    pattern: /^Stored credentials were written in format version \d+/,
    action: () =>
      `${KEEP_STORE} A newer now-sdk wrote them; upgrade fluent-mcp to a release that bundles that now-sdk version or later.`,
  },
  {
    // key-provider.js OsKeyringProvider.setKey (migration from the legacy keychain entry)
    pattern: /^Could not write the credential encryption key to the OS keyring/,
    action: (addCommand, _failure, baseDir) => {
      const customCredDir = resolveCredentialsDir(process.env, baseDir);
      const dirClause = customCredDir ? ` with SN_SDK_CREDENTIALS_DIR=${customCredDir}` : '';
      return (
        `${KEEP_STORE} To migrate your existing legacy keychain profiles, unlock the OS keyring, then restart this MCP server ` +
        'and check auth status again. Switching to an env-backed store does not migrate legacy keychain entries; to use env keys ' +
        `instead, configure SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY (a base64-encoded 32-byte key)${dirClause} in both your ` +
        `terminal and this MCP server's environment, re-add the needed profiles from that terminal (e.g. ${addCommand}), then restart ` +
        'the MCP server and check auth status.'
      );
    },
  },
  {
    // index.js externalKeyMissingError (SN_SDK_KEY_SOURCE=env)
    pattern: /^SN_SDK_ENCRYPTION_KEY is not set, but encrypted credentials exist/,
    action: () => `Set SN_SDK_ENCRYPTION_KEY to the key the stored credentials were encrypted with ${SERVER_ENV}. ${RESTORE_KEYRING} ${KEEP_STORE}`,
  },
  {
    // index.js read(): an env key that does not decrypt the file
    pattern: /^Could not decrypt the stored credentials at .+ with SN_SDK_ENCRYPTION_KEY/,
    action: () => `Set SN_SDK_ENCRYPTION_KEY to the original key ${SERVER_ENV}. ${RESTORE_KEYRING} ${KEEP_STORE}`,
  },
  {
    // key-provider.js EnvVarKeyProvider.getKey
    pattern: /^SN_SDK_ENCRYPTION_KEY must be a base64-encoded 32-byte key/,
    action: () =>
      `Set SN_SDK_ENCRYPTION_KEY to the base64-encoded 32-byte key the stored credentials were encrypted with ${SERVER_ENV}. ${RESTORE_KEYRING} ${KEEP_STORE}`,
  },
  {
    // key-provider.js getActiveKeyProvider
    pattern: /^Unknown SN_SDK_KEY_SOURCE /,
    action: () => `Set SN_SDK_KEY_SOURCE to keyring or env, or unset it to use the OS keyring, ${SERVER_ENV}.`,
  },
];

/**
 * Leading logger tag, command-level prefixes (`logger.error('<prefix>', error)`),
 * and debug `util.inspect(error)` Error-class prefixes that the SDK CLI can prepend
 * before a credential-store error message.
 */
const CLI_LOGGER_ERROR_PREFIX = /^\[now-sdk\] ERROR:\s+/;
const SDK_COMMAND_ERROR_PREFIX =
  /^(?:Transform failed\.|Failed to fetch dependencies|Failed to add [^:\n]+:|cicd [^\n:]+ failed:|Failed to query table '[^'\n]+':|Failed to execute script:|Build failed:|Error running script:)\s+/;
const INSPECTED_ERROR_PREFIX = /^(?:[A-Z][A-Za-z0-9_]*)?Error(?:\s*\[[^\]]+\])?:\s+/;

/**
 * Strip known SDK CLI logger/command/debug-inspect prefixes from a failure line
 * so credential-store classification and path extraction work uniformly across
 * all SDK commands and `--debug` mode without matching arbitrary user text.
 */
export function normalizeSdkErrorPrefix(text: string): string {
  return text
    .trim()
    .replace(CLI_LOGGER_ERROR_PREFIX, '')
    .replace(SDK_COMMAND_ERROR_PREFIX, '')
    .replace(INSPECTED_ERROR_PREFIX, '');
}

/** True for an SDK credential-store diagnostic, before any instance request. */
export function isCredentialStoreFailure(message: string): boolean {
  const normalized = normalizeSdkErrorPrefix(message);
  return CREDENTIAL_STORE_RULES.some(({ pattern }) => pattern.test(normalized));
}

/**
 * Return safe recovery guidance when `failure` matches a known SDK v4.14.0+
 * credential-store error, or `undefined` when it is not a recognized store error.
 */
export function credentialStoreRecoveryGuidance(
  failure: string,
  addCommand: string = DEFAULT_ADD_COMMAND,
  baseDir: string = SERVER_START_CWD
): string | undefined {
  const normalized = normalizeSdkErrorPrefix(failure);
  const rule = CREDENTIAL_STORE_RULES.find(({ pattern }) => pattern.test(normalized));
  return rule ? rule.action(addCommand, normalized, baseDir) : undefined;
}

/** Preserve application output, including exec's errors array. Only the SDK's own
 * credential failures get new recovery instructions. In machine mode rewrite just
 * the envelope's error.message so diagnostic text cannot change other JSON fields.
 */
export function recoverCredentialStoreFailure(
  output: string, message: string | undefined, outputTruncated?: boolean
): { output: string; message?: string } {
  const failure = message ?? output.trim();
  if (outputTruncated || !isCredentialStoreFailure(failure)) return { output, message };

  const envelope = parseCliEnvelope(output);
  if (envelope) {
    const sdkError = envelope.error?.message;
    if (envelope.ok !== false || typeof sdkError !== 'string' || !isCredentialStoreFailure(sdkError)) {
      return { output, message };
    }
    const sanitized = sanitizeCredentialStoreMessage(sdkError);
    if (sanitized !== sdkError) {
      // The SDK writes one compact envelope after any log lines.
      const trimmed = output.trim();
      const prefix = trimmed.startsWith('{') ? '' : trimmed.slice(0, trimmed.lastIndexOf('\n') + 1);
      output = prefix + JSON.stringify({ ...envelope, error: { ...envelope.error, message: sanitized } });
    }
  } else {
    output = sanitizeCredentialStoreMessage(output);
  }

  const sanitized = sanitizeCredentialStoreMessage(failure).trim();
  const recovery = credentialStoreRecoveryGuidance(sanitized);
  return { output, message: recovery ? `${sanitized}\n\n${recovery}` : sanitized };
}
