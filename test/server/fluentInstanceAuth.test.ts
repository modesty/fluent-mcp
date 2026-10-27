/**
 * Tests for startup auto-auth behavior: profiles are only auto-added when the
 * add can complete non-interactively (basic auth with credentials). OAuth and
 * credential-less basic skip the add and emit a single not_authenticated NOTICE.
 */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledWith } from '../support/mockAssertions.js';
import { loggerFixture, withEnvironment } from '../support/fixtures.js';
import type { ToolsManager } from '../../src/tools/toolsManager.js';

// The logger fixture keeps the run quiet.
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);

const { autoValidateAuthIfConfigured } = await import('../../src/server/fluentInstanceAuth.js');

function makeToolsManager(listOutput = '', listExitCode = 0) {
  const runAuth = mock.fn(async (args: Record<string, unknown>) => {
    if (args.list) {
      return { success: listExitCode === 0, output: listOutput, exitCode: listExitCode };
    }
    // add / use
    return { success: true, output: '', exitCode: 0 };
  });
  return { runAuth, toolsManager: { runAuth } as unknown as ToolsManager };
}

describe('autoValidateAuthIfConfigured', () => {
  let restoreEnvironment: () => void;

  beforeEach(() => {
    // Start every test with no auth environment; the previous values come back
    // after the test, including anything the test itself sets.
    restoreEnvironment = withEnvironment({
      SN_INSTANCE_URL: undefined,
      SN_AUTH_TYPE: undefined,
      SN_USER_NAME: undefined,
      SN_USERNAME: undefined,
      SN_PASSWORD: undefined,
    });
  });

  afterEach(() => {
    restoreEnvironment();
  });

  it('skips entirely when SN_INSTANCE_URL is not set', async () => {
    const tm = makeToolsManager();
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);
    assert.equal(result.status, 'skipped');
    assert.equal(tm.runAuth.mock.callCount(), 0);
  });

  it('does NOT auto-add for oauth when no matching profile exists', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    const tm = makeToolsManager('');
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'not_authenticated');
    assert.ok(result.actionRequired?.includes('auth --add'));
    // Only the list call — never an add.
    assert.equal(tm.runAuth.mock.callCount(), 1);
    assertCalledWith(tm.runAuth, { list: true });
  });

  it('does NOT auto-add for basic when credentials are absent', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';

    const tm = makeToolsManager('');
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'not_authenticated');
    assert.equal(tm.runAuth.mock.callCount(), 1);
  });

  it('auto-adds for basic when credentials are present', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';
    process.env.SN_USER_NAME = 'admin';
    process.env.SN_PASSWORD = 'secret';

    const tm = makeToolsManager('');
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'authenticated');
    // list + add
    assert.equal(tm.runAuth.mock.callCount(), 2);
    assert.ok(
      tm.runAuth.mock.calls.some((call) => {
        const args = call.arguments[0];
        return args.add === 'https://dev12345.service-now.com' && args.type === 'basic';
      })
    );
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
    assert.equal(tm.runAuth.mock.callCount(), 1); // list only
  });

  it('reports an unreadable credential store instead of attempting an add (SDK v4.14.0+)', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';
    process.env.SN_USER_NAME = 'admin';
    process.env.SN_PASSWORD = 'secret';

    // `auth --list` logs failures on stdout and exits 1 (sdk-cli command/auth/index.js).
    const tm = makeToolsManager(
      "[now-sdk] ERROR: Stored credentials at /home/u/.now-sdk/credentials.enc could not be read. Run 'now-sdk auth --delete all' and re-authenticate to reset.",
      1
    );
    const result = await autoValidateAuthIfConfigured(tm.toolsManager);

    assert.equal(result.status, 'validation_error');
    assert.match(result.message, /could not list auth profiles: Stored credentials at \/home\/u\/\.now-sdk\/credentials\.enc could not be read/);
    assert.ok(result.actionRequired?.startsWith("Run 'now-sdk auth --delete all' in a terminal"));
    // Only the list call: a basic add would fail on the same unreadable store.
    assert.equal(tm.runAuth.mock.callCount(), 1);
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
      assert.equal(tm.runAuth.mock.callCount(), 1);
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
    assert.equal(tm.runAuth.mock.callCount(), 1);
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

    // The matching non-default profile is switched to; the log line never became a profile.
    assert.equal(result.status, 'authenticated');
    assert.equal(result.alias, 'dev12345');
    assertCalledWith(tm.runAuth, { use: 'dev12345' });
  });
});
