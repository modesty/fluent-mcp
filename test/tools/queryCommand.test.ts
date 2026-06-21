/**
 * Tests for the SDK v4.8.0 `query` command wrapper (QueryCommand).
 * Verifies metadata, argv construction (positional table + shell-quoted encoded
 * query + JSON envelope default), the `--no-exclude-reference-link` negation, the
 * required-authentication gate, and the query-specific validation that permits
 * encoded-query operators while rejecting shell-injection characters.
 */
import { QueryCommand } from '../../src/tools/commands/queryCommand.js';
import { SessionManager } from '../../src/utils/sessionManager.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());
jest.mock('../../src/utils/rootContext.js', () => require('../mocks/index.js').createRootContextMock());
// Default the session to a resolvable auth alias so the required-auth gate passes;
// individual tests override getAuthAlias to exercise the unauthenticated path.
jest.mock('../../src/utils/sessionManager.js', () =>
  require('../mocks/index.js').createSessionManagerMock({
    getAuthAlias: jest.fn().mockReturnValue('session-alias'),
  })
);

// The encoded query is single-quoted on POSIX shells and double-quoted on Windows.
const Q = process.platform === 'win32' ? '"' : "'";
const quoted = (query: string) => `${Q}${query}${Q}`;

describe('QueryCommand', () => {
  let mockProcessor: { process: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks resets call records but not implementations; re-assert the
    // default alias so a prior test's per-call override cannot leak.
    (SessionManager.getInstance().getAuthAlias as jest.Mock).mockReturnValue('session-alias');
    mockProcessor = {
      process: jest.fn().mockResolvedValue({ success: true, output: '{"records":[]}', exitCode: 0 }),
    };
  });

  test('should expose read-only metadata with required table and query', () => {
    const command = new QueryCommand(mockProcessor as never);
    expect(command.name).toBe('query_fluent_records');
    expect(command.annotations.readOnlyHint).toBe(true);
    expect(command.timeoutMs).toBe(60_000);

    const required = command.arguments.filter((a) => a.required).map((a) => a.name);
    expect(required).toEqual(['table', 'query']);
  });

  test('should build argv with positional table, shell-quoted query, JSON envelope, and session auth', async () => {
    const command = new QueryCommand(mockProcessor as never);

    const result = await command.execute({ table: 'incident', query: 'active=true^priority<=2' });

    expect(result.success).toBe(true);
    expect(mockProcessor.process).toHaveBeenCalledWith(
      'npx',
      [
        '-y', '@servicenow/sdk', 'query', 'incident',
        '--query', quoted('active=true^priority<=2'),
        '--output', 'json',
        '--auth', 'session-alias',
      ],
      false,
      '/mock/working/dir',
      undefined,
      60000
    );
  });

  test('should prefer an explicitly provided auth alias over the session alias', async () => {
    const command = new QueryCommand(mockProcessor as never);

    await command.execute({ table: 'incident', query: 'active=true', auth: 'explicit-alias' });

    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv).toEqual(expect.arrayContaining(['--auth', 'explicit-alias']));
    expect(argv).not.toContain('session-alias');
  });

  test('should map optional flags and append --debug', async () => {
    const command = new QueryCommand(mockProcessor as never);

    await command.execute({
      table: 'sys_user',
      query: 'active=true',
      fields: 'name,email',
      limit: 50,
      offset: 10,
      displayValue: 'all',
      noCount: true,
      debug: true,
    });

    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv.slice(0, 4)).toEqual(['-y', '@servicenow/sdk', 'query', 'sys_user']);
    expect(argv).toEqual(expect.arrayContaining([
      '--query', quoted('active=true'),
      '--fields', 'name,email',
      '--limit', '50',
      '--offset', '10',
      '--display-value', 'all',
      '--no-count',
      '--output', 'json',
      '--debug',
    ]));
  });

  test('should emit --no-exclude-reference-link only when excludeReferenceLink is false', async () => {
    const command = new QueryCommand(mockProcessor as never);

    await command.execute({ table: 'incident', query: 'active=true', excludeReferenceLink: false });
    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv).toContain('--no-exclude-reference-link');

    mockProcessor.process.mockClear();
    await command.execute({ table: 'incident', query: 'active=true', excludeReferenceLink: true });
    const argv2 = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv2).not.toContain('--no-exclude-reference-link');
  });

  test('should fail fast when no auth alias is available (neither provided nor in session)', async () => {
    (SessionManager.getInstance().getAuthAlias as jest.Mock).mockReturnValue(undefined);
    const command = new QueryCommand(mockProcessor as never);

    const result = await command.execute({ table: 'incident', query: 'active=true' });

    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/requires authentication to a ServiceNow instance/i);
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should still accept an explicit auth alias when the session has none', async () => {
    (SessionManager.getInstance().getAuthAlias as jest.Mock).mockReturnValue(undefined);
    const command = new QueryCommand(mockProcessor as never);

    const result = await command.execute({ table: 'incident', query: 'active=true', auth: 'explicit-alias' });

    expect(result.success).toBe(true);
    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv).toEqual(expect.arrayContaining(['--auth', 'explicit-alias']));
  });

  test('should reject encoded queries containing single quotes (shell-escape break-out)', async () => {
    const command = new QueryCommand(mockProcessor as never);
    await expect(command.execute({ table: 'incident', query: "name=';rm -rf /" }))
      .rejects.toThrow(/Invalid characters in argument 'query'/);
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject encoded queries containing double quotes (Windows break-out)', async () => {
    const command = new QueryCommand(mockProcessor as never);
    await expect(command.execute({ table: 'incident', query: 'name="x"&calc' }))
      .rejects.toThrow(/Invalid characters in argument 'query'/);
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject encoded queries containing a backslash', async () => {
    const command = new QueryCommand(mockProcessor as never);
    await expect(command.execute({ table: 'incident', query: 'name=foo\\bar' }))
      .rejects.toThrow(/Invalid characters in argument 'query'/);
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject encoded queries containing control characters', async () => {
    const command = new QueryCommand(mockProcessor as never);
    await expect(command.execute({ table: 'incident', query: 'active=true\nmalicious' }))
      .rejects.toThrow(/Invalid characters in argument 'query'/);
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject an empty or whitespace-only query', async () => {
    const command = new QueryCommand(mockProcessor as never);
    await expect(command.execute({ table: 'incident', query: '' }))
      .rejects.toThrow(/Missing required argument 'query'/);
    await expect(command.execute({ table: 'incident', query: '   ' }))
      .rejects.toThrow(/Missing required argument 'query'/);
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject an invalid displayValue', async () => {
    const command = new QueryCommand(mockProcessor as never);
    await expect(command.execute({ table: 'incident', query: 'active=true', displayValue: 'yes' }))
      .rejects.toThrow(/displayValue/);
  });

  test('should reject a table name with shell metacharacters', async () => {
    const command = new QueryCommand(mockProcessor as never);
    await expect(command.execute({ table: 'incident;ls', query: 'active=true' }))
      .rejects.toThrow();
  });
});
