/**
 * Tests for the SDK v4.8.0 `query` command wrapper (QueryCommand).
 * Verifies metadata, argv construction (positional table + literal encoded
 * query + JSON envelope default), the `--no-exclude-reference-link` negation, the
 * required-authentication gate, the table-name domain, and encoded-query
 * operators passing through as one literal argv entry.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { hasOption, optionValue } from '../support/argv.js';
import { assertCalledWith, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture, tempProjectDir } from '../support/fixtures.js';
import type { CommandProcessor } from '../../src/utils/types.js';

// The session still has a project directory: query must not use it.
const WORKING_DIR = tempProjectDir('working-dir');
const PACKAGE_ROOT = '/mock/package/root';

// Session replacement. Default the session to a resolvable auth alias so the
// required-auth gate passes; individual tests override getAuthAlias to exercise
// the unauthenticated path.
const session = {
  getWorkingDirectory: mock.fn((): string | undefined => WORKING_DIR),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => 'session-alias'),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(),
  setAuthValidationResult: mock.fn(),
};

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
const config = configFixture();
config.getProjectRootPath.mock.mockImplementation(() => PACKAGE_ROOT);
mock.module('../../src/config.js', config.mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => session } },
});

const { QueryCommand } = await import('../../src/tools/commands/queryCommand.js');
const { ENVELOPE_RUN_OPTIONS } = await import('../../src/utils/jsonSelect.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessFn = CommandProcessor['process'];

/** Asserts every expected token appears in argv (order-insensitive). */
function assertContainsAll(actual: readonly string[], expected: readonly string[]): void {
  for (const token of expected) {
    assert.ok(actual.includes(token), `expected argv to contain ${JSON.stringify(token)}; received ${JSON.stringify(actual)}`);
  }
}

describe('QueryCommand', () => {
  let mockProcessor: { process: ReturnType<typeof mock.fn<ProcessFn>> };

  /** argv handed to the processor on its n-th call. */
  const argvOf = (call = 0): string[] => mockProcessor.process.mock.calls[call].arguments[1];

  beforeEach(() => {
    // Re-assert the default alias and working directory so a prior test's
    // per-call override cannot leak.
    session.getAuthAlias.mock.mockImplementation(() => 'session-alias');
    session.getWorkingDirectory.mock.mockImplementation(() => WORKING_DIR);
    mockProcessor = {
      process: mock.fn<ProcessFn>(async () => ({ success: true, output: '{"records":[]}', exitCode: 0 })),
    };
  });

  it('should expose read-only metadata with required table and query', () => {
    const command = new QueryCommand(mockProcessor);
    assert.equal(command.name, 'query_fluent_records');
    assert.equal(command.annotations.readOnlyHint, true);
    assert.equal(command.timeoutMs, 60_000);

    const required = command.arguments.filter((a) => a.required).map((a) => a.name);
    assert.deepStrictEqual(required, ['table', 'query']);
  });

  it('should build argv with positional table, literal query, JSON envelope, and session auth', async () => {
    const command = new QueryCommand(mockProcessor);

    const result = await command.execute({ table: 'incident', query: 'active=true^priority<=2' });

    assert.equal(result.success, true);
    assertCalledWith(
      mockProcessor.process,
      process.execPath,
      [
        SDK_BIN, 'query', 'incident',
        '--query=active=true^priority<=2',
        '--output=json',
        '--auth=session-alias',
      ],
      PACKAGE_ROOT,
      60000,
      undefined,
      ENVELOPE_RUN_OPTIONS
    );
  });

  it('should prefer an explicitly provided auth alias over the session alias', async () => {
    const command = new QueryCommand(mockProcessor);

    await command.execute({ table: 'incident', query: 'active=true', auth: 'explicit-alias' });

    const authEntries = argvOf().filter((entry) => entry.startsWith('--auth'));
    assert.deepStrictEqual(authEntries, ['--auth=explicit-alias']);
  });

  it('should run in the installed package directory, with no Fluent project configured', async () => {
    session.getWorkingDirectory.mock.mockImplementation(() => undefined);
    const command = new QueryCommand(mockProcessor);

    const result = await command.execute({ table: 'sys_app', query: 'scope=x_acme_app' });

    assert.equal(result.success, true);
    assert.equal(mockProcessor.process.mock.calls[0].arguments[2], PACKAGE_ROOT);
  });

  it('should not accept workingDirectory: the CLI reads nothing from its cwd', async () => {
    const command = new QueryCommand(mockProcessor);
    assert.ok(!command.arguments.some((a) => a.name === 'workingDirectory'));

    await assert.rejects(
      command.execute({ table: 'sys_app', query: 'active=true', workingDirectory: WORKING_DIR }),
      /Unrecognized key: "workingDirectory"/
    );
    assertNotCalled(mockProcessor.process);
  });

  it('should map optional flags and append --debug', async () => {
    const command = new QueryCommand(mockProcessor);

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

    const argv = argvOf();
    assert.deepStrictEqual(argv.slice(0, 3), [
      SDK_BIN,
      'query',
      'sys_user',
    ]);
    assertContainsAll(argv, [
      '--query=active=true',
      '--fields=name,email',
      '--limit=50',
      '--offset=10',
      '--display-value=all',
      '--no-count',
      '--output=json',
      '--debug',
    ]);
  });

  it('should emit --no-exclude-reference-link only when excludeReferenceLink is false', async () => {
    const command = new QueryCommand(mockProcessor);

    await command.execute({ table: 'incident', query: 'active=true', excludeReferenceLink: false });
    const argv = argvOf();
    assert.ok(argv.includes('--no-exclude-reference-link'));

    mockProcessor.process.mock.resetCalls();
    await command.execute({ table: 'incident', query: 'active=true', excludeReferenceLink: true });
    const argv2 = argvOf();
    assert.ok(!argv2.includes('--no-exclude-reference-link'));
  });

  it('should fail fast when no auth alias is available (neither provided nor in session)', async () => {
    session.getAuthAlias.mock.mockImplementation(() => undefined);
    const command = new QueryCommand(mockProcessor);

    const result = await command.execute({ table: 'incident', query: 'active=true' });

    assert.equal(result.success, false);
    assert.match(result.error?.message ?? '', /requires authentication to a ServiceNow instance/i);
    assertNotCalled(mockProcessor.process);
  });

  it('should still accept an explicit auth alias when the session has none', async () => {
    session.getAuthAlias.mock.mockImplementation(() => undefined);
    const command = new QueryCommand(mockProcessor);

    const result = await command.execute({ table: 'incident', query: 'active=true', auth: 'explicit-alias' });

    assert.equal(result.success, true);
    assertContainsAll(argvOf(), ['--auth=explicit-alias']);
  });

  for (const query of [
    "name=O'Reilly",
    'name="quoted"&active=true',
    'path=foo\\bar',
    'name=`literal`$(whoami);*.ts',
  ]) {
    it(`should pass printable punctuation as one literal query argv entry: ${query}`, async () => {
      const command = new QueryCommand(mockProcessor);
      const result = await command.execute({ table: 'incident', query });

      assert.equal(result.success, true);
      const argv = argvOf();
      assert.equal(optionValue(argv, '--query'), query);
    });
  }

  it('should reject encoded queries containing control characters', async () => {
    const command = new QueryCommand(mockProcessor);
    await assert.rejects(
      command.execute({ table: 'incident', query: 'active=true\nmalicious' }),
      /Invalid characters in argument 'query'/
    );
    assertNotCalled(mockProcessor.process);
  });

  it('should reject an empty or whitespace-only query', async () => {
    const command = new QueryCommand(mockProcessor);
    await assert.rejects(
      command.execute({ table: 'incident', query: '' }),
      /Missing required argument 'query'/
    );
    await assert.rejects(
      command.execute({ table: 'incident', query: '   ' }),
      /Missing required argument 'query'/
    );
    assertNotCalled(mockProcessor.process);
  });

  it('should reject an invalid displayValue', async () => {
    const command = new QueryCommand(mockProcessor);
    await assert.rejects(
      command.execute({ table: 'incident', query: 'active=true', displayValue: 'yes' }),
      /displayValue/
    );
  });

  // The SDK requests `/api/now/table/${table}` unencoded, so anything but a
  // table name would change the endpoint (or, with a leading "-", the argv).
  for (const table of ['incident;ls', '../../api/now/v2/table/sys_user', 'incident?sysparm_limit=1', 'incident#x', 'a.b', '--auth=other-alias', '']) {
    it(`should reject a table that is not a table name: ${JSON.stringify(table)}`, async () => {
      const command = new QueryCommand(mockProcessor);
      await assert.rejects(
        command.execute({ table, query: 'active=true' }),
        /Argument 'table' must be a table name: letters, digits, and "_"/
      );
      assertNotCalled(mockProcessor.process);
    });
  }

  it('should accept ordinary table names', async () => {
    const command = new QueryCommand(mockProcessor);
    for (const table of ['incident', 'sys_user', 'x_acme_app_task', 'cmdb_ci_win_server']) {
      assert.equal((await command.execute({ table, query: 'active=true', auth: 'a' })).success, true);
    }
  });

  // The SDK's --select extractor accepts numeric subscripts (sdk-cli
  // util/json-select.ts), and this tool documents `records[0].sys_id`: the
  // select path has its own grammar (SELECT_PATH_DOMAIN).
  for (const select of [
    'records[0].sys_id',
    'result.records[10].opened_by.display_value',
    'ok',
  ]) {
    it(`should accept a documented select path without forwarding --select: ${select}`, async () => {
      const command = new QueryCommand(mockProcessor);
      const result = await command.execute({ table: 'incident', query: 'active=true', select });

      assert.equal(result.success, true);
      assert.ok(!hasOption(argvOf(), '--select'));
    });
  }

  // The CLI applies --select to failure envelopes too (printing only null), so the
  // tool applies it to a successful envelope and keeps a failure's full envelope.
  it('should apply select to a successful envelope and keep a failure envelope whole', async () => {
    mockProcessor.process.mock.mockImplementation(async () => ({
      success: true, output: '{"ok":true,"hasMore":false,"records":[{"sys_id":"abc"}]}\n', exitCode: 0,
    }));
    const ok = await new QueryCommand(mockProcessor).execute({ table: 'incident', query: 'active=true', select: 'records[0].sys_id' });
    assert.equal(ok.output, '"abc"');

    const failure = '{"ok":false,"error":{"message":"Invalid table","status":400,"table":"nope"}}';
    mockProcessor.process.mock.mockImplementation(async () => ({ success: false, output: failure, exitCode: 1 }));
    const failed = await new QueryCommand(mockProcessor).execute({ table: 'nope', query: 'active=true', select: 'records[0].sys_id' });
    assert.equal(failed.output, failure);
  });

  for (const select of [
    'records[0]; rm -rf /',
    'records[*].sys_id',
    'records["0"].sys_id',
    'records[0].sys id',
    '',
  ]) {
    it(`should reject a select path outside the SDK grammar: ${select}`, async () => {
      const command = new QueryCommand(mockProcessor);
      await assert.rejects(
        command.execute({ table: 'incident', query: 'active=true', select }),
        /Argument 'select' must be a dot\/bracket path/
      );
      assertNotCalled(mockProcessor.process);
    });
  }
});
