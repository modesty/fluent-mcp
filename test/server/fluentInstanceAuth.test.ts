/**
 * Tests for lazy auto-auth validation. The server only reads the SDK's profile
 * store (AuthCommand: one JSON envelope from the SDK's credential API): a
 * matching profile is used per call, and with none it returns the command that
 * adds one in a terminal. The store and its default
 * profile are global state other now-sdk runs share, so validation never adds,
 * deletes or selects a profile (W9 review).
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { assertCalledWith } from '../support/mockAssertions.js';
import { loggerFixture, withEnvironment } from '../support/fixtures.js';
import type { ToolsManager } from '../../src/tools/toolsManager.js';

// The logger fixture keeps the run quiet, and records what the result logger writes.
const { logger, mockOptions: loggerOptions } = loggerFixture();
mock.module('../../src/utils/logger.js', loggerOptions);

const { autoValidateAuthIfConfigured, logAuthValidationResult } = await import('../../src/server/fluentInstanceAuth.js');
const { SessionManager } = await import('../../src/utils/sessionManager.js');

/**
 * A ToolsManager whose listAuthProfiles answers with the given reader output
 * and exit code. listAuthProfiles is the only ToolsManager entry point
 * validation uses; it has no way to write the profile store.
 */
function makeToolsManager(listOutput = listing(), listExitCode = 0, error?: Error) {
  const listAuthProfiles = mock.fn(async () => ({ success: listExitCode === 0, output: listOutput, exitCode: listExitCode, error }));
  return { listAuthProfiles, toolsManager: { listAuthProfiles } as unknown as ToolsManager };
}

/** The profile reader's success envelope (AuthCommand LIST_PROFILES_SCRIPT) for the given profiles. */
function listing(...profiles: { alias: string; host: string; type?: string; isDefault?: boolean }[]): string {
  return JSON.stringify({
    ok: true,
    profiles: profiles.map(({ alias, host, type = 'basic', isDefault = false }) => ({ alias, host, type, isDefault })),
  });
}

/** The profile reader's failure envelope carrying the SDK's thrown message. */
function failed(message: string): string {
  return JSON.stringify({ ok: false, error: { message } });
}

const BASIC_ENV = {
  SN_INSTANCE_URL: 'https://dev12345.service-now.com',
  SN_AUTH_TYPE: 'basic',
};

const ADD_COMMAND = 'npx @servicenow/sdk auth --add https://dev12345.service-now.com --type basic --alias dev12345.service-now.com';

describe('autoValidateAuthIfConfigured', () => {
  let restoreEnvironment: () => void;

  beforeEach(() => {
    // Start every test with no auth environment; the previous values come back
    // after the test, including anything the test itself sets.
    restoreEnvironment = withEnvironment({
      SN_INSTANCE_URL: undefined,
      SN_AUTH_TYPE: undefined,
      SN_SDK_KEY_SOURCE: undefined,
      SN_SDK_ENCRYPTION_KEY: undefined,
      SN_SDK_CREDENTIALS_DIR: undefined,
    });
  });

  afterEach(() => {
    restoreEnvironment();
    // Every result is stored on the process-wide session; do not leak it.
    SessionManager.getInstance().clearSession();
  });

  it('skips entirely when SN_INSTANCE_URL is not set', async () => {
    const tm = makeToolsManager();
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);
    assert.equal(result.status, 'skipped');
    assert.equal(tm.listAuthProfiles.mock.callCount(), 0);
  });

  it('returns the basic add command and stores the result when no profile matches', async () => {
    Object.assign(process.env, BASIC_ENV);

    // auth --add makes the new profile the CLI default, so the server never
    // adds one itself; the user runs the returned command (W9 review).
    const tm = makeToolsManager();
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
    assert.equal(result.status, 'not_authenticated');
    assert.equal(result.message, 'No auth profile matches dev12345.service-now.com. The server does not add profiles; add one in a terminal with the command below.');
    assert.equal(result.actionRequired, ADD_COMMAND);
    assert.equal(SessionManager.getInstance().getAuthAlias(), undefined);
    assert.deepEqual(SessionManager.getInstance().getAuthValidationResult(), result);
  });

  it('says how to keep the current CLI default when adding by hand', async () => {
    Object.assign(process.env, BASIC_ENV);

    const tm = makeToolsManager(listing({ alias: 'other', host: 'https://other.service-now.com', isDefault: true }));
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.actionRequired, ADD_COMMAND);
    assert.match(result.message, /auth --add makes the new profile the CLI default for every now-sdk run on this machine; run npx @servicenow\/sdk auth --use other afterwards to keep other as the default\.$/);
  });

  it('asks for another alias when the derived one belongs to a profile for another host', async () => {
    Object.assign(process.env, BASIC_ENV);

    // `auth --add` replaces a profile stored under the same alias.
    const tm = makeToolsManager(listing({ alias: 'dev12345.service-now.com', host: 'https://elsewhere.service-now.com' }));
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'not_authenticated');
    assert.match(result.message, /The alias dev12345\.service-now\.com belongs to a profile for another host, which adding under it would replace, so choose another alias\./);
    assert.equal(result.actionRequired, 'npx @servicenow/sdk auth --add https://dev12345.service-now.com --type basic --alias <new alias>');
    assert.equal(SessionManager.getInstance().getAuthAlias(), undefined);
  });

  it('uses an existing matching profile without adding', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    const tm = makeToolsManager(listing({ alias: 'dev12345', host: 'https://dev12345.service-now.com', type: 'oauth', isDefault: true }));
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'authenticated');
    assert.equal(result.isDefault, true);
    assert.equal(tm.listAuthProfiles.mock.callCount(), 1); // list only
  });

  it('uses a matching non-default profile per call and never switches the CLI default', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    // Lazy auth used to run `auth --use`, so even check_auth_status redirected
    // every other now-sdk run on the machine to this instance (W9 review).
    const tm = makeToolsManager(listing(
      { alias: 'other', host: 'https://other.service-now.com', isDefault: true },
      { alias: 'dev12345', host: 'https://dev12345.service-now.com' },
    ));
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
    assert.equal(result.status, 'authenticated');
    assert.equal(result.alias, 'dev12345');
    assert.equal(result.isDefault, false);
    assert.equal(result.message, 'Auto-auth validated: profile dev12345 matches SN_INSTANCE_URL; it is passed per call, and the CLI default profile is unchanged');
    // Every instance command passes the alias as --auth.
    assert.equal(SessionManager.getInstance().getAuthAlias(), 'dev12345');
  });

  it('reports validation_error when the SDK CLI cannot be resolved', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    // listAuthProfiles -> AuthCommand.execute -> resolveSdkCli(), which throws when the
    // bundled CLI is missing (src/utils/sdkCli.ts).
    const cliError = 'Unable to resolve the bundled @servicenow/sdk CLI. The fluent-mcp installation is incomplete; reinstall its dependencies before running SDK commands.';
    const listAuthProfiles = mock.fn(async () => {
      throw new Error(cliError);
    });
    const result = await autoValidateAuthIfConfigured({ listAuthProfiles } as unknown as ToolsManager);

    assert.equal(result.status, 'validation_error');
    assert.equal(result.message, `Auth validation failed: ${cliError}`);
    assert.equal(result.actionRequired, 'npx @servicenow/sdk auth --add https://dev12345.service-now.com --type oauth --alias dev12345.service-now.com');
    assert.equal(result.host, 'dev12345.service-now.com');
    assert.equal(listAuthProfiles.mock.callCount(), 1);
  });

  it('reports an unreadable credential store without destructive reset advice in message, and qualifies last-resort reset in actionRequired (SDK v4.14.0+)', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';

    // The reader reports the SDK's thrown message in an ok:false envelope and exits 1.
    // SDK v4.14.2 also emits this exact message when an env-key store is opened with the
    // default keyring provider, so `message` must NOT repeat the CLI's `--delete all`
    // imperative, and `actionRequired` must check key source/store dir/keyring first.
    const tm = makeToolsManager(
      failed("Stored credentials at /home/u/.now-sdk/credentials.enc could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset."),
      1
    );
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.equal(
      result.message,
      'Auth validation failed: could not list auth profiles: Stored credentials at /home/u/.now-sdk/credentials.enc could not be read.'
    );
    assert.ok(!result.message.includes('--delete all'));
    assert.ok(!result.message.includes('re-authenticate'));

    const action = result.actionRequired ?? '';
    assert.match(action, /SN_SDK_CREDENTIALS_DIR/);
    assert.match(action, /SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY/);
    assert.match(action, /OS keyring is unlocked and accessible/);
    assert.match(action, /restart this MCP server/);
    assert.match(action, /Only as a last resort: first confirm your terminal resolves the reported file path \(\/home\/u\/\.now-sdk\/credentials\.enc\)/);
    assert.match(action, /removes credentials\.enc in that directory plus the shared OS keyring key and legacy keychain entry/);
    assert.match(action, /now-sdk auth --delete all/);
    assert.ok(action.includes(ADD_COMMAND));
    // Recovery checks and path/scope warnings must precede the last-resort reset command.
    assert.ok(action.indexOf('SN_SDK_KEY_SOURCE=env') < action.indexOf('--delete all'));
    assert.ok(action.indexOf('confirm your terminal resolves the reported file path') < action.indexOf("run 'now-sdk auth --delete all'"));
    assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
  });

  it('distinguishes keyring retry (with server restart) from switching to env keys (requires re-adding and restart)', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    const cliError = 'Could not write the credential encryption key to the OS keyring: The user name or passphrase you entered is not correct.';
    const tm = makeToolsManager(failed(cliError), 1);
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.ok(result.message.includes(cliError));
    const action = result.actionRequired ?? '';
    assert.match(action, /Do not reset the stored credentials/);
    assert.match(action, /migrate your existing legacy keychain profiles, unlock the OS keyring, then restart this MCP server and check auth status again/);
    assert.match(action, /Switching to an env-backed store does not migrate legacy keychain entries/);
    assert.match(action, /SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY/);
    assert.match(action, /re-add the needed profiles from that terminal/);
    assert.match(action, /then restart the MCP server and check auth status/);
    assert.ok(!action.includes('--delete all'));
    assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
  });

  it('requires configuring SN_SDK_ENCRYPTION_KEY before auth --add on first-time SN_SDK_KEY_SOURCE=env setup', async () => {
    Object.assign(process.env, BASIC_ENV, { SN_SDK_KEY_SOURCE: 'env' });

    // With SN_SDK_KEY_SOURCE=env, no credentials.enc, and no SN_SDK_ENCRYPTION_KEY,
    // the reader exits 0 with zero profiles, but `auth --add` would fail on first write.
    const tm = makeToolsManager();
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'not_authenticated');
    assert.match(result.message, /SN_SDK_KEY_SOURCE=env is set without SN_SDK_ENCRYPTION_KEY/);
    assert.match(result.message, /base64-encoded 32-byte key/);
    assert.match(result.message, /both your terminal and this MCP server's environment/);
    assert.match(result.actionRequired ?? '', /base64-encoded 32-byte key/);
    assert.match(result.actionRequired ?? '', /SN_SDK_KEY_SOURCE=env and the same SN_SDK_ENCRYPTION_KEY/);
    assert.ok(result.actionRequired?.includes(ADD_COMMAND));
    assert.match(result.actionRequired ?? '', /restart this MCP server/);
  });

  it('reminds users to match SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY in the terminal when key is already set', async () => {
    Object.assign(process.env, BASIC_ENV, {
      SN_SDK_KEY_SOURCE: 'env',
      SN_SDK_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    });

    const tm = makeToolsManager();
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'not_authenticated');
    assert.match(result.message, /Because SN_SDK_KEY_SOURCE=env is active/);
    assert.match(result.message, /same SN_SDK_KEY_SOURCE=env and SN_SDK_ENCRYPTION_KEY/);
    assert.match(result.actionRequired ?? '', /SN_SDK_KEY_SOURCE=env and the same SN_SDK_ENCRYPTION_KEY/);
    assert.ok(result.actionRequired?.includes(ADD_COMMAND), result.actionRequired);
    assert.match(result.actionRequired ?? '', /restart this MCP server/);
  });

  it('carries a resolved SN_SDK_CREDENTIALS_DIR into migration fallback re-add instructions', async () => {
    const relativeDir = path.join('..', '.tmp-migration-store', 'profile');
    const resolvedDir = path.resolve(process.cwd(), relativeDir);
    Object.assign(process.env, BASIC_ENV, { SN_SDK_CREDENTIALS_DIR: relativeDir });

    const cliError = 'Could not write the credential encryption key to the OS keyring: Keyring locked.';
    const tm = makeToolsManager(failed(cliError), 1);
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.ok(
      result.actionRequired?.includes(`SN_SDK_CREDENTIALS_DIR=${resolvedDir}`),
      result.actionRequired
    );
    assert.ok(result.actionRequired?.includes(ADD_COMMAND), result.actionRequired);
  });

  it('resolves a relative SN_SDK_CREDENTIALS_DIR (including ../) cleanly in unreadable, missing-key, and first-time setup guidance', async () => {
    const relativeDir = path.join('..', '.tmp-cred-store', 'profile');
    const resolvedDir = path.resolve(process.cwd(), relativeDir);
    const resolvedFile = path.join(resolvedDir, 'credentials.enc');
    Object.assign(process.env, BASIC_ENV, { SN_SDK_CREDENTIALS_DIR: relativeDir });

    // 1. Unreadable store reporting a relative path.
    const unreadable = makeToolsManager(
      failed(`Stored credentials at ${path.join(relativeDir, 'credentials.enc')} could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.`),
      1
    );
    const errResult = await autoValidateAuthIfConfigured(unreadable.toolsManager);
    assert.equal(errResult.status, 'validation_error');
    assert.ok(errResult.message.includes(resolvedFile), errResult.message);
    assert.ok(errResult.actionRequired?.includes(resolvedFile), errResult.actionRequired);
    assert.ok(errResult.actionRequired?.includes(`SN_SDK_CREDENTIALS_DIR=${resolvedDir}`), errResult.actionRequired);

    // 2. Missing SN_SDK_ENCRYPTION_KEY with a path starting with `../` (must not stop at the first `.`).
    const missingKey = makeToolsManager(
      failed(`SN_SDK_ENCRYPTION_KEY is not set, but encrypted credentials exist at ${path.join(relativeDir, 'credentials.enc')}. Set it to the key they were encrypted with. The stored credentials were not modified.`),
      1
    );
    const missingKeyResult = await autoValidateAuthIfConfigured(missingKey.toolsManager);
    assert.equal(missingKeyResult.status, 'validation_error');
    assert.equal(
      missingKeyResult.message,
      `Auth validation failed: could not list auth profiles: SN_SDK_ENCRYPTION_KEY is not set, but encrypted credentials exist at ${resolvedFile}. Set it to the key they were encrypted with. The stored credentials were not modified.`
    );

    // 3. First-time setup (empty store) under a relative SN_SDK_CREDENTIALS_DIR.
    const empty = makeToolsManager();
    const setupResult = await autoValidateAuthIfConfigured(empty.toolsManager);
    assert.equal(setupResult.status, 'not_authenticated');
    assert.ok(setupResult.message.includes(resolvedDir), setupResult.message);
    assert.ok(setupResult.actionRequired?.includes(`SN_SDK_CREDENTIALS_DIR=${resolvedDir}`), setupResult.actionRequired);
    assert.ok(setupResult.actionRequired?.includes(ADD_COMMAND), setupResult.actionRequired);
  });

  it('strips destructive deletion advice from a wrong SN_SDK_ENCRYPTION_KEY error message', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    const cliError =
      "Could not decrypt the stored credentials at /home/u/.now-sdk/credentials.enc with SN_SDK_ENCRYPTION_KEY: the key doesn't match, or the file is corrupted. The stored credentials were not reset. Set SN_SDK_ENCRYPTION_KEY to the original key, or delete that file to start over.";
    const tm = makeToolsManager(failed(cliError), 1);
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.equal(
      result.message,
      "Auth validation failed: could not list auth profiles: Could not decrypt the stored credentials at /home/u/.now-sdk/credentials.enc with SN_SDK_ENCRYPTION_KEY: the key doesn't match, or the file is corrupted. The stored credentials were not reset."
    );
    assert.ok(!result.message.includes('delete that file'), result.message);
    assert.ok(!result.message.includes('--delete all'), result.message);
    assert.match(result.actionRequired ?? '', /Set SN_SDK_ENCRYPTION_KEY to the original key in this MCP server's environment/);
    assert.ok(!result.actionRequired?.includes('--delete all'));
    assert.ok(!result.actionRequired?.includes('auth --add'));
  });

  // Store errors where `auth --delete all` and `auth --add` are both the WRONG advice
  // (sdk-cli credential-store): resetting would destroy a newer now-sdk's data or discard
  // credentials the right env key can still decrypt.
  for (const [label, cliError, fix] of [
    [
      'a credentials file written by a newer now-sdk',
      'Stored credentials were written in format version 2, but this version of now-sdk only supports up to version 1. Upgrade now-sdk to read them.',
      /upgrade fluent-mcp to a release that bundles that now-sdk version or later/,
    ],
    // SDK v4.14.2 SN_SDK_KEY_SOURCE=env (sdk-cli credential-store/index.js, key-provider.js): the
    // SDK itself never offers a reset here, because the right key can still read the store.
    [
      'an env-sourced key that is not set',
      'SN_SDK_ENCRYPTION_KEY is not set, but encrypted credentials exist at /home/u/.now-sdk/credentials.enc. Set it to the key they were encrypted with. The stored credentials were not modified.',
      /Set SN_SDK_ENCRYPTION_KEY to the key the stored credentials were encrypted with in this MCP server's environment/,
    ],
    [
      'a malformed env-sourced key',
      'SN_SDK_ENCRYPTION_KEY must be a base64-encoded 32-byte key.',
      /Set SN_SDK_ENCRYPTION_KEY to the base64-encoded 32-byte key/,
    ],
    [
      'an unknown key source',
      'Unknown SN_SDK_KEY_SOURCE "vault". Expected one of: keyring, env.',
      /Set SN_SDK_KEY_SOURCE to keyring or env, or unset it/,
    ],
  ] as const) {
    it(`gives the fix for ${label}, never 'auth --delete all' or an add`, async () => {
      process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
      process.env.SN_AUTH_TYPE = 'oauth';

      const tm = makeToolsManager(failed(cliError), 1);
      const result = await autoValidateAuthIfConfigured(tm.toolsManager);

      assert.equal(result.status, 'validation_error');
      assert.ok(result.message.includes(cliError));
      assert.match(result.actionRequired ?? '', fix);
      assert.ok(!result.actionRequired?.includes('--delete all'));
      assert.ok(!result.actionRequired?.includes('auth --add'));
      assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
    });
  }

  it('reports any other non-zero reader exit with its output and the add command', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    const tm = makeToolsManager('unexpected failure', 1);
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.match(result.message, /could not list auth profiles: unexpected failure/);
    assert.ok(result.actionRequired?.includes('auth --add'));
    assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
  });

  it('reports a reader that died before writing an envelope with the error it left on stderr', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    // E.g. a future SDK that adds an `exports` map to sdk-cli: the require throws
    // before the script's own handler runs, and CLIExecutor extracts stderr into `error`.
    const crash = "Error: Cannot find module '@servicenow/sdk-cli/dist/auth/index.js'";
    const tm = makeToolsManager('', 1, new Error(crash));
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.equal(result.message, `Auth validation failed: could not list auth profiles: ${crash}`);
    assert.equal(SessionManager.getInstance().getAuthAlias(), undefined);
  });

  it('reads the envelope after a LOG_LEVEL notice the SDK logger prints while loading', async () => {
    Object.assign(process.env, BASIC_ENV);

    const output = [
      '[now-sdk] Setting log level to debug from process.env.LOG_LEVEL',
      listing({ alias: 'dev12345', host: 'https://dev12345.service-now.com' }),
    ].join('\n');
    const result = await autoValidateAuthIfConfigured(makeToolsManager(output).toolsManager);

    assert.equal(result.status, 'authenticated');
    assert.equal(result.alias, 'dev12345');
  });

  // Fail closed: a listing the server cannot trust is never partly used.
  for (const [label, output] of [
    ['empty output', ''],
    ['human auth --list text', '[now-sdk] Listing all credentials: \n*[dev12345]\n      host = https://dev12345.service-now.com'],
    ['an envelope without ok: true', JSON.stringify({ profiles: [] })],
    ['a profiles value that is not an array', JSON.stringify({ ok: true, profiles: {} })],
    ['an entry without a string alias', JSON.stringify({ ok: true, profiles: [{ host: 'https://dev12345.service-now.com', isDefault: false }] })],
    ['an entry without a boolean isDefault', JSON.stringify({
      ok: true,
      profiles: [
        { alias: 'other', host: 'https://other.service-now.com', isDefault: false },
        { alias: 'dev12345', host: 'https://dev12345.service-now.com', isDefault: 'no' },
      ],
    })],
  ] as const) {
    it(`reports validation_error and selects nothing for ${label}`, async () => {
      Object.assign(process.env, BASIC_ENV);

      const result = await autoValidateAuthIfConfigured(makeToolsManager(output).toolsManager);

      assert.equal(result.status, 'validation_error');
      assert.equal(result.message, 'Auth validation failed: the bundled SDK returned no well-formed auth profile listing.');
      assert.match(result.actionRequired ?? '', /Reinstall fluent-mcp/);
      assert.equal(SessionManager.getInstance().getAuthAlias(), undefined);
    });
  }

  it('takes aliases verbatim: an alias with ] or a newline cannot forge another profile', async () => {
    process.env.SN_INSTANCE_URL = 'https://target.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';

    // In `auth --list` text, `x]\n[spoofed` printed as two complete headers and gave
    // the target host to `spoofed`. Structured, it is one alias, and it has a newline.
    const forged = listing(
      { alias: 'spoofed', host: 'https://other.service-now.com', isDefault: true },
      { alias: 'x]\n[spoofed', host: 'https://target.service-now.com' },
    );
    const forgedResult = await autoValidateAuthIfConfigured(makeToolsManager(forged).toolsManager);
    assert.equal(forgedResult.status, 'validation_error');
    assert.equal(SessionManager.getInstance().getAuthAlias(), undefined);

    SessionManager.getInstance().clearSession();
    const bracket = listing({ alias: 'bad]name', host: 'https://target.service-now.com' });
    const bracketResult = await autoValidateAuthIfConfigured(makeToolsManager(bracket).toolsManager);
    assert.equal(bracketResult.status, 'authenticated');
    assert.equal(bracketResult.alias, 'bad]name');

    SessionManager.getInstance().clearSession();
    const nowSdk = listing({ alias: 'now-sdk', host: 'https://target.service-now.com' });
    const nowSdkResult = await autoValidateAuthIfConfigured(makeToolsManager(nowSdk).toolsManager);
    assert.equal(nowSdkResult.status, 'authenticated');
    assert.equal(nowSdkResult.alias, 'now-sdk');
  });

  it('rejects a matching alias with control characters and gives store settings and the CLI default warning', async () => {
    const relativeDir = path.join('..', '.tmp-sgr-store', 'profile');
    const resolvedDir = path.resolve(process.cwd(), relativeDir);
    process.env.SN_INSTANCE_URL = 'https://target.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';
    process.env.SN_SDK_CREDENTIALS_DIR = relativeDir;
    process.env.SN_SDK_KEY_SOURCE = 'env';
    process.env.SN_SDK_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');

    const result = await autoValidateAuthIfConfigured(makeToolsManager(listing(
      { alias: 'dev01', host: 'https://other.service-now.com', isDefault: true },
      { alias: 'dev\x1b[31m01', host: 'https://target.service-now.com' },
    )).toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.equal(result.alias, undefined);
    assert.equal(SessionManager.getInstance().getAuthAlias(), undefined);
    assert.match(result.message, /control or escape characters/);
    assert.match(result.message, /auth --add makes the new profile the CLI default.*auth --use dev01/);
    assert.ok(result.message.includes(`SN_SDK_CREDENTIALS_DIR=${resolvedDir}`), result.message);
    assert.ok(!result.message.includes('\x1b'));
    assert.equal(
      result.actionRequired,
      `Set SN_SDK_CREDENTIALS_DIR=${resolvedDir} and SN_SDK_KEY_SOURCE=env and the same SN_SDK_ENCRYPTION_KEY in your terminal, ` +
      "run 'npx @servicenow/sdk auth --add https://target.service-now.com --type basic --alias target.service-now.com', then restart this MCP server."
    );
  });

  it('omits the auth --use hint when the CLI default alias has control characters', async () => {
    Object.assign(process.env, BASIC_ENV);

    const result = await autoValidateAuthIfConfigured(makeToolsManager(listing(
      { alias: 'evil\nalias', host: 'https://other.service-now.com', isDefault: true },
    )).toolsManager);

    assert.equal(result.status, 'not_authenticated');
    assert.match(result.message, /auth --add makes the new profile the CLI default for every now-sdk run on this machine\.$/);
    assert.ok(!result.message.includes('auth --use'));
  });

  it('prefers a plain-text alias when another profile for the same host has control characters', async () => {
    process.env.SN_INSTANCE_URL = 'https://target.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';

    const result = await autoValidateAuthIfConfigured(makeToolsManager(listing(
      { alias: 'dev\x1b[31m01', host: 'https://target.service-now.com' },
      { alias: 'target-clean', host: 'https://target.service-now.com' },
    )).toolsManager);

    assert.equal(result.status, 'authenticated');
    assert.equal(result.alias, 'target-clean');
    assert.equal(SessionManager.getInstance().getAuthAlias(), 'target-clean');
  });
});

describe('logAuthValidationResult', () => {
  beforeEach(() => {
    for (const level of Object.values(logger)) level.mock.resetCalls();
  });

  const statusSeverity = [
    ['authenticated', 'info'],
    ['skipped', 'debug'],
    ['not_authenticated', 'notice'],
    ['validation_error', 'warn'],
  ] as const;

  for (const [status, method] of statusSeverity) {
    it(`logs ${status} at ${method} severity`, () => {
      logAuthValidationResult({
        status,
        message: `Auth status: ${status}`,
        timestamp: '2026-07-29T00:00:00.000Z',
        alias: 'dev',
        host: 'dev.example.com',
        authType: 'oauth',
        actionRequired: 'now-sdk auth --add https://dev.example.com',
      });

      assertCalledWith(logger[method], `Auth status: ${status}`, {
        status,
        timestamp: '2026-07-29T00:00:00.000Z',
        alias: 'dev',
        host: 'dev.example.com',
        authType: 'oauth',
        actionRequired: 'now-sdk auth --add https://dev.example.com',
      });
    });
  }

  it('logs only the allow-listed fields', () => {
    const result = {
      status: 'authenticated' as const,
      message: 'ok',
      timestamp: '2026-07-29T00:00:00.000Z',
      password: 'secret',
    };
    logAuthValidationResult(result);

    assertCalledWith(logger.info, 'ok', { status: 'authenticated', timestamp: '2026-07-29T00:00:00.000Z' });
  });
});
