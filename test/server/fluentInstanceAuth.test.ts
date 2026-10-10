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

function makeToolsManager(listOutput = '') {
  const runAuth = mock.fn(async (args: Record<string, unknown>) => {
    if (args.list) {
      return { success: true, output: listOutput, exitCode: 0 };
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
});
