/**
 * Tests for the SDK v4.8.0 `query` command wrapper (QueryCommand).
 * Verifies metadata, argv construction (positional table + single-quoted encoded
 * query + JSON envelope default), the `--no-exclude-reference-link` negation, and
 * the query-specific validation that permits encoded-query operators while
 * rejecting shell-injection characters.
 */
import { QueryCommand } from '../../src/tools/commands/queryCommand.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());
jest.mock('../../src/utils/rootContext.js', () => require('../mocks/index.js').createRootContextMock());
jest.mock('../../src/utils/sessionManager.js', () => require('../mocks/index.js').createSessionManagerMock());

describe('QueryCommand', () => {
  let mockProcessor: { process: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
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

  test('should build argv with positional table, single-quoted query, and JSON envelope default', async () => {
    const command = new QueryCommand(mockProcessor as never);

    const result = await command.execute({ table: 'incident', query: 'active=true^priority<=2' });

    expect(result.success).toBe(true);
    expect(mockProcessor.process).toHaveBeenCalledWith(
      'npx',
      [
        '-y', '@servicenow/sdk', 'query', 'incident',
        '--query', `'active=true^priority<=2'`,
        '--output', 'json',
      ],
      false,
      '/mock/working/dir',
      undefined,
      60000
    );
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
      '--query', `'active=true'`,
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

  test('should reject encoded queries containing single quotes (shell-escape break-out)', async () => {
    const command = new QueryCommand(mockProcessor as never);
    await expect(command.execute({ table: 'incident', query: "name=';rm -rf /" }))
      .rejects.toThrow(/Invalid characters in argument 'query'/);
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
