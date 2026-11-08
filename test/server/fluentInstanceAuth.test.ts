/**
 * Tests for lazy auto-auth validation. The server only reads the CLI's profile
 * store (`auth --list`): a matching profile is used per call, and with none it
 * returns the command that adds one in a terminal. The store and its default
 * profile are global state other now-sdk runs share, so validation never adds,
 * deletes or selects a profile (W9 review).
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledWith } from '../support/mockAssertions.js';
import { loggerFixture, withEnvironment } from '../support/fixtures.js';
import type { ToolsManager } from '../../src/tools/toolsManager.js';

// The logger fixture keeps the run quiet, and records what the result logger writes.
const { logger, mockOptions: loggerOptions } = loggerFixture();
mock.module('../../src/utils/logger.js', loggerOptions);

const { autoValidateAuthIfConfigured, logAuthValidationResult } = await import('../../src/server/fluentInstanceAuth.js');
const { SessionManager } = await import('../../src/utils/sessionManager.js');

/**
 * A ToolsManager whose listAuthProfiles answers `auth --list` with the given
 * output and exit code. listAuthProfiles is the only ToolsManager entry point
 * validation uses; it has no way to write the profile store.
 */
function makeToolsManager(listOutput = '', listExitCode = 0) {
  const listAuthProfiles = mock.fn(async () => ({ success: listExitCode === 0, output: listOutput, exitCode: listExitCode }));
  return { listAuthProfiles, toolsManager: { listAuthProfiles } as unknown as ToolsManager };
}

/** `auth --list` output for the given profiles, as the CLI prints it. */
function listing(...profiles: { alias: string; host: string; isDefault?: boolean }[]): string {
  return ['[now-sdk] Listing all credentials: ', ...profiles.flatMap(({ alias, host, isDefault }) => [
    isDefault ? `*[${alias}]` : `[${alias}]`,
    `      host = ${host}`,
    '      type = basic',
    '      username = admin',
    `      ${isDefault ? 'default = Yes' : 'default = No'}`,
  ])].join('\n');
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

  it('returns the oauth add command when no profile matches', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    const tm = makeToolsManager('');
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'not_authenticated');
    assert.equal(result.actionRequired, 'npx @servicenow/sdk auth --add https://dev12345.service-now.com --type oauth --alias dev12345.service-now.com');
    assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
  });

  it('returns the basic add command and stores the result when no profile matches', async () => {
    Object.assign(process.env, BASIC_ENV);

    // auth --add makes the new profile the CLI default, so the server never
    // adds one itself; the user runs the returned command (W9 review).
    const tm = makeToolsManager('');
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

    const listOutput = [
      '*[dev12345]',
      '  host = https://dev12345.service-now.com',
      '  type = oauth',
      '  default = yes',
    ].join('\n');

    const tm = makeToolsManager(listOutput);
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

  it('reports an unreadable credential store instead of no matching profile (SDK v4.14.0+)', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';

    // `auth --list` logs failures on stdout and exits 1 (sdk-cli command/auth/index.js).
    const tm = makeToolsManager(
      "[now-sdk] ERROR: Stored credentials at /home/u/.now-sdk/credentials.enc could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.",
      1
    );
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.match(result.message, /could not list auth profiles: Stored credentials at \/home\/u\/\.now-sdk\/credentials\.enc could not be read/);
    assert.ok(result.actionRequired?.startsWith("Run 'now-sdk auth --delete all' in a terminal"));
    assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
  });

  // Store errors where `auth --delete all` is the WRONG advice (sdk-cli credential-store):
  // resetting would destroy a newer now-sdk's data, or delete the legacy keychain entry
  // older SDK installs still read. The CLI's own message is surfaced instead.
  for (const [label, cliError] of [
    [
      'a credentials file written by a newer now-sdk',
      'Stored credentials were written in format version 2, but this version of now-sdk only supports up to version 1. Upgrade now-sdk to read them.',
    ],
    [
      'a keyring write failure during migration',
      'Could not write the credential encryption key to the OS keyring: The user name or passphrase you entered is not correct.',
    ],
  ] as const) {
    it(`never advises 'auth --delete all' for ${label}`, async () => {
      process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
      process.env.SN_AUTH_TYPE = 'oauth';

      const tm = makeToolsManager(`[now-sdk] ERROR: ${cliError}`, 1);
      const result = await autoValidateAuthIfConfigured(tm.toolsManager);

      assert.equal(result.status, 'validation_error');
      assert.ok(result.message.includes(cliError));
      assert.ok(!result.actionRequired?.includes('--delete all'));
      assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
    });
  }

  it('reports any other non-zero auth --list exit with the CLI output and the add command', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    const tm = makeToolsManager('unexpected failure', 1);
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.match(result.message, /could not list auth profiles: unexpected failure/);
    assert.ok(result.actionRequired?.includes('auth --add'));
    assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
  });

  it('ignores CLI log lines when parsing profiles (hardening)', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    // Hardening, not a reproduced failure: real `auth --list` output prints log lines
    // only before the profiles. The WARN line between the header and its `host =`
    // line makes this test discriminating — the former regex (`^\*?\[([^\]]+)\]`)
    // would start a bogus `now-sdk` profile there and give it dev12345's host.
    const listOutput = [
      '[now-sdk] Listing all credentials: ',
      '[dev12345]',
      '[now-sdk] WARN: example log line between a profile header and its fields',
      '      host = https://dev12345.service-now.com',
      '      type = oauth',
      '      default = No',
    ].join('\n');

    const tm = makeToolsManager(listOutput);
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    // The matching non-default profile is used; the log line never became a profile.
    assert.equal(result.status, 'authenticated');
    assert.equal(result.alias, 'dev12345');
    assert.equal(tm.listAuthProfiles.mock.callCount(), 1);
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
