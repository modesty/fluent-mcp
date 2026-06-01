/**
 * Tests for startup auto-auth behavior: profiles are only auto-added when the
 * add can complete non-interactively (basic auth with credentials). OAuth and
 * credential-less basic skip the add and emit a single not_authenticated NOTICE.
 */
import { autoValidateAuthIfConfigured } from '../../src/server/fluentInstanceAuth.js';

function makeToolsManager(listOutput = '') {
  const runAuth = jest.fn(async (args: Record<string, unknown>) => {
    if (args.list) {
      return { success: true, output: listOutput, exitCode: 0 };
    }
    // add / use
    return { success: true, output: '', exitCode: 0 };
  });
  return { runAuth } as any;
}

describe('autoValidateAuthIfConfigured', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.SN_INSTANCE_URL;
    delete process.env.SN_AUTH_TYPE;
    delete process.env.SN_USER_NAME;
    delete process.env.SN_USERNAME;
    delete process.env.SN_PASSWORD;
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('skips entirely when SN_INSTANCE_URL is not set', async () => {
    const tm = makeToolsManager();
    const result = await autoValidateAuthIfConfigured(tm);
    expect(result.status).toBe('skipped');
    expect(tm.runAuth).not.toHaveBeenCalled();
  });

  it('does NOT auto-add for oauth when no matching profile exists', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'oauth';

    const tm = makeToolsManager('');
    const result = await autoValidateAuthIfConfigured(tm);

    expect(result.status).toBe('not_authenticated');
    expect(result.actionRequired).toContain('auth --add');
    // Only the list call — never an add.
    expect(tm.runAuth).toHaveBeenCalledTimes(1);
    expect(tm.runAuth).toHaveBeenCalledWith({ list: true });
  });

  it('does NOT auto-add for basic when credentials are absent', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';

    const tm = makeToolsManager('');
    const result = await autoValidateAuthIfConfigured(tm);

    expect(result.status).toBe('not_authenticated');
    expect(tm.runAuth).toHaveBeenCalledTimes(1);
  });

  it('auto-adds for basic when credentials are present', async () => {
    process.env.SN_INSTANCE_URL = 'https://dev12345.service-now.com';
    process.env.SN_AUTH_TYPE = 'basic';
    process.env.SN_USER_NAME = 'admin';
    process.env.SN_PASSWORD = 'secret';

    const tm = makeToolsManager('');
    const result = await autoValidateAuthIfConfigured(tm);

    expect(result.status).toBe('authenticated');
    // list + add
    expect(tm.runAuth).toHaveBeenCalledTimes(2);
    expect(tm.runAuth).toHaveBeenCalledWith(
      expect.objectContaining({ add: 'https://dev12345.service-now.com', type: 'basic' })
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
    const result = await autoValidateAuthIfConfigured(tm);

    expect(result.status).toBe('authenticated');
    expect(result.isDefault).toBe(true);
    expect(tm.runAuth).toHaveBeenCalledTimes(1); // list only
  });
});
