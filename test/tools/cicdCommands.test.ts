/**
 * Tests for the SDK v4.10.0 `cicd` command wrappers (CicdAppCommand,
 * CicdTestCommand). Verifies metadata and risk annotations, nested-subcommand
 * argv construction, the `--no-wait` negation (the flag defaults to true in the
 * CLI, so only the negation is meaningful), the required-authentication gate,
 * and the per-leaf argument legality checks that keep an unusable combination
 * from reaching the CLI as an opaque failure.
 */
import { beforeEach, afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledWith, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor } from '../../src/utils/types.js';

// Session replacement. Default the session to a resolvable auth alias so the
// required-auth gate passes; individual tests override getAuthAlias to exercise
// the unauthenticated path.
const session = {
  getWorkingDirectory: mock.fn((): string | undefined => '/mock/working/dir'),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => 'session-alias'),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(),
  setAuthValidationResult: mock.fn(),
};

// Commands that need no Fluent project run in the project root (neutral cwd).
const config = configFixture();
config.getProjectRootPath.mock.mockImplementation(() => '/mock/project/root');

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/config.js', config.mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => session } },
});

const { CicdAppCommand } = await import('../../src/tools/commands/cicdAppCommand.js');
const { CicdTestCommand } = await import('../../src/tools/commands/cicdTestCommand.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessFn = CommandProcessor['process'];
type MockProcessor = { process: ReturnType<typeof mock.fn<ProcessFn>> };

function createProcessor(): MockProcessor {
  return {
    process: mock.fn<ProcessFn>(async () => ({ success: true, output: '{"ok":true}', exitCode: 0 })),
  };
}

/** Restores the session defaults a prior test's per-call override may have changed. */
function resetSession(): void {
  session.getAuthAlias.mock.mockImplementation(() => 'session-alias');
  session.getWorkingDirectory.mock.mockImplementation(() => '/mock/working/dir');
}

describe('CicdAppCommand', () => {
  let mockProcessor: MockProcessor;

  beforeEach(() => {
    resetSession();
    mockProcessor = createProcessor();
  });

  it('should expose destructive metadata with action as the only required argument', () => {
    const command = new CicdAppCommand(mockProcessor);
    assert.equal(command.name, 'cicd_fluent_app');
    assert.equal(command.annotations.destructiveHint, true);
    assert.equal(command.annotations.idempotentHint, false);
    assert.equal(command.annotations.openWorldHint, true);

    const required = command.arguments.filter((a) => a.required).map((a) => a.name);
    assert.deepStrictEqual(required, ['action']);
  });

  it('should cover the poll window so the CLI reports its own timeout first', () => {
    const command = new CicdAppCommand(mockProcessor);
    // The CLI polls for up to 900_000 ms by default; the runner timeout must sit
    // above it, or the child is killed before the CLI can report cleanly.
    assert.ok((command.timeoutMs ?? 0) > 900_000);
  });

  it('should build install argv with the subcommand token, JSON envelope, and session auth', async () => {
    const command = new CicdAppCommand(mockProcessor);

    const result = await command.execute({ action: 'install', appSysId: 'abc123', appVersion: '1.0.0' });

    assert.equal(result.success, true);
    assertCalledWith(
      mockProcessor.process,
      process.execPath,
      [
        SDK_BIN, 'cicd', 'install',
        '--app-sys-id', 'abc123',
        '--app-version', '1.0.0',
        '--auth', 'session-alias',
        '--output', 'json',
      ],
      '/mock/working/dir',
      undefined,
      command.timeoutMs,
      undefined
    );
  });

  it('should emit the --no-wait negation rather than dropping a false value', async () => {
    const command = new CicdAppCommand(mockProcessor);

    await command.execute({ action: 'publish', scope: 'x_myco_app', wait: false });

    const argv = mockProcessor.process.mock.calls[0].arguments[1];
    assert.ok(argv.includes('--no-wait'));
    assert.ok(!argv.includes('--wait'));
  });

  it('should pass publish-only and install-only flags through', async () => {
    const command = new CicdAppCommand(mockProcessor);

    await command.execute({ action: 'publish', scope: 'x_myco_app', devNotes: 'release notes' });
    assert.ok(mockProcessor.process.mock.calls[0].arguments[1].includes('--dev-notes'));

    mockProcessor.process.mock.resetCalls();
    await command.execute({ action: 'install', scope: 'x_myco_app', autoUpgradeBaseApp: true });
    assert.ok(mockProcessor.process.mock.calls[0].arguments[1].includes('--auto-upgrade-base-app'));
  });

  it('should reject an unknown action instead of interpolating it into argv', async () => {
    const command = new CicdAppCommand(mockProcessor);

    const result = await command.execute({ action: 'uninstall' });

    assert.equal(result.success, false);
    assert.ok(result.output.includes('install, publish, rollback'));
    assertNotCalled(mockProcessor.process);
  });

  it('should reject scope and appSysId together', async () => {
    const command = new CicdAppCommand(mockProcessor);

    const result = await command.execute({ action: 'install', scope: 'x_myco_app', appSysId: 'abc123' });

    assert.equal(result.success, false);
    assert.ok(result.output.includes('mutually exclusive'));
    assertNotCalled(mockProcessor.process);
  });

  it('should require appVersion for rollback', async () => {
    const command = new CicdAppCommand(mockProcessor);

    const result = await command.execute({ action: 'rollback', appSysId: 'abc123' });

    assert.equal(result.success, false);
    assert.ok(result.output.includes("'appVersion' is required"));
    assertNotCalled(mockProcessor.process);
  });

  it('should reject install-only arguments on a non-install action', async () => {
    const command = new CicdAppCommand(mockProcessor);

    const result = await command.execute({ action: 'publish', scope: 'x_myco_app', baseAppVersion: '2.0.0' });

    assert.equal(result.success, false);
    assert.ok(result.output.includes('baseAppVersion'));
    assertNotCalled(mockProcessor.process);
  });

  it('should accept punctuation in devNotes but reject control characters', async () => {
    const command = new CicdAppCommand(mockProcessor);

    // Release notes routinely contain punctuation the base shell-metacharacter
    // check rejects; it is inert on the shell-free path and must pass through.
    const notes = 'Fixes (SN-123); adds retry & backoff';
    const ok = await command.execute({ action: 'publish', scope: 'x_myco_app', devNotes: notes });
    assert.equal(ok.success, true);
    const argv = mockProcessor.process.mock.calls[0].arguments[1];
    assert.equal(argv[argv.indexOf('--dev-notes') + 1], notes);

    mockProcessor.process.mock.resetCalls();
    const bad = await command.execute({ action: 'publish', scope: 'x_myco_app', devNotes: 'line1\nline2' });
    assert.equal(bad.success, false);
    assert.ok(bad.output.includes('control characters'));
    assertNotCalled(mockProcessor.process);
  });

  it('should fail with an actionable message when no auth alias can be resolved', async () => {
    session.getAuthAlias.mock.mockImplementation(() => undefined);
    const command = new CicdAppCommand(mockProcessor);

    const result = await command.execute({ action: 'install', appSysId: 'abc123' });

    assert.equal(result.success, false);
    assert.ok(result.output.includes('now-sdk auth --add'));
    assertNotCalled(mockProcessor.process);
  });

  it('should reject an output format the CLI does not declare', async () => {
    const command = new CicdAppCommand(mockProcessor);

    const result = await command.execute({ action: 'install', appSysId: 'abc123', output: 'yaml' });

    assert.equal(result.success, false);
    assert.ok(result.output.includes('json, raw'));
    assertNotCalled(mockProcessor.process);
  });

  it('should pass a bracket select path through to --select', async () => {
    const command = new CicdAppCommand(mockProcessor);

    await command.execute({
      action: 'install', appSysId: 'abc123', select: 'result.links.results[0].id',
    });

    const argv = mockProcessor.process.mock.calls[0].arguments[1];
    assert.equal(argv[argv.indexOf('--select') + 1], 'result.links.results[0].id');
  });

  describe('without a Fluent project directory', () => {
    beforeEach(() => {
      session.getWorkingDirectory.mock.mockImplementation(() => undefined);
    });

    afterEach(() => {
      session.getWorkingDirectory.mock.mockImplementation(() => '/mock/working/dir');
    });

    // The CLI defaults --app-version from the cwd's package.json. Outside a Fluent
    // project the only cwd available is the MCP server's own install directory, so
    // an inferred version would be this server's version, not the app's.
    for (const action of ['install', 'publish']) {
      it(`should require appVersion rather than let the CLI infer this server version (${action})`, async () => {
        const command = new CicdAppCommand(mockProcessor);

        const result = await command.execute({ action, scope: 'x_myco_app' });

        assert.equal(result.success, false);
        assert.ok(result.output.includes("requires 'appVersion'"));
        assertNotCalled(mockProcessor.process);
      });
    }

    it('should proceed once the application and version are both explicit', async () => {
      const command = new CicdAppCommand(mockProcessor);

      const result = await command.execute({
        action: 'install', scope: 'x_myco_app', appVersion: '2.1.0',
      });

      assert.equal(result.success, true);
      const [, argv, cwd] = mockProcessor.process.mock.calls[0].arguments;
      assert.ok(argv.includes('--app-version'));
      assert.ok(argv.includes('2.1.0'));
      // Neutral cwd only: both project-derived defaults were supplied explicitly.
      assert.equal(cwd, '/mock/project/root');
    });

    it('should still name the identifier as the first missing piece', async () => {
      const command = new CicdAppCommand(mockProcessor);

      const result = await command.execute({ action: 'install' });

      assert.equal(result.success, false);
      assert.ok(result.output.includes('could not identify the application'));
      assertNotCalled(mockProcessor.process);
    });
  });
});

describe('CicdTestCommand', () => {
  let mockProcessor: MockProcessor;

  beforeEach(() => {
    resetSession();
    mockProcessor = createProcessor();
  });

  // `run` executes real ATF steps, which create/update/delete records under the
  // runner's impersonation. Annotations are per-tool, so the annotation must follow
  // the widest blast radius the tool can reach rather than its read-only leaves.
  it('should expose destructive metadata requiring target and action', () => {
    const command = new CicdTestCommand(mockProcessor);
    assert.equal(command.name, 'cicd_fluent_test');
    assert.equal(command.annotations.destructiveHint, true);
    assert.equal(command.annotations.openWorldHint, true);

    const required = command.arguments.filter((a) => a.required).map((a) => a.name);
    assert.deepStrictEqual(required, ['target', 'action']);
  });

  // These leaves read nothing from the project, so no working directory is
  // accepted: a broken FLUENT_MCP_WORKING_DIR must not block a result lookup.
  it('should not depend on a Fluent project directory', async () => {
    session.getWorkingDirectory.mock.mockImplementation(() => 'relative/not/absolute');
    const command = new CicdTestCommand(mockProcessor);

    assert.equal(command.arguments.some((a) => a.name === 'workingDirectory'), false);

    const result = await command.execute({ target: 'test', action: 'result', resultId: 'res-1' });

    assert.equal(result.success, true);
    assert.equal(mockProcessor.process.mock.calls[0].arguments[2], '/mock/project/root');
    session.getWorkingDirectory.mock.mockImplementation(() => '/mock/working/dir');
  });

  it('should build testsuite run argv with both nested subcommand tokens', async () => {
    const command = new CicdTestCommand(mockProcessor);

    const result = await command.execute({
      target: 'testsuite',
      action: 'run',
      testSuiteName: 'Regression Suite',
    });

    assert.equal(result.success, true);
    assertCalledWith(
      mockProcessor.process,
      process.execPath,
      [
        SDK_BIN, 'cicd', 'testsuite', 'run',
        '--test-suite-name', 'Regression Suite',
        '--auth', 'session-alias',
        '--output', 'json',
      ],
      '/mock/project/root',
      undefined,
      command.timeoutMs,
      undefined
    );
  });

  it('should build test watch argv from a progressId', async () => {
    const command = new CicdTestCommand(mockProcessor);

    await command.execute({ target: 'test', action: 'watch', progressId: 'prog-1' });

    const argv = mockProcessor.process.mock.calls[0].arguments[1];
    assert.deepStrictEqual(argv.slice(0, 4), [SDK_BIN, 'cicd', 'test', 'watch']);
    assert.ok(argv.includes('--progress-id'));
    assert.ok(argv.includes('prog-1'));
  });

  it('should omit both polling flags for the result leaf, which is a plain read', async () => {
    const command = new CicdTestCommand(mockProcessor);

    await command.execute({ target: 'testsuite', action: 'result', resultId: 'res-1' });

    const argv = mockProcessor.process.mock.calls[0].arguments[1];
    assert.ok(argv.includes('--result-id'));
    assert.ok(!argv.includes('--wait'));
    assert.ok(!argv.includes('--no-wait'));
    assert.ok(!argv.includes('--poll-timeout'));
  });

  it('should reject unknown target and action tokens', async () => {
    const command = new CicdTestCommand(mockProcessor);

    const badTarget = await command.execute({ target: 'suite', action: 'run' });
    assert.equal(badTarget.success, false);
    assert.ok(badTarget.output.includes('testsuite, test'));

    const badAction = await command.execute({ target: 'test', action: 'rerun' });
    assert.equal(badAction.success, false);
    assert.ok(badAction.output.includes('run, watch, result'));

    assertNotCalled(mockProcessor.process);
  });

  it('should require an identifier to run, and reject both at once', async () => {
    const command = new CicdTestCommand(mockProcessor);

    const missing = await command.execute({ target: 'testsuite', action: 'run' });
    assert.equal(missing.success, false);
    assert.ok(missing.output.includes("either 'testSuiteSysId' or 'testSuiteName'"));

    const both = await command.execute({
      target: 'test', action: 'run', testSysId: 'a', testName: 'b',
    });
    assert.equal(both.success, false);
    assert.ok(both.output.includes('mutually exclusive'));
  });

  it('should require progressId for watch and resultId for result', async () => {
    const command = new CicdTestCommand(mockProcessor);

    const watch = await command.execute({ target: 'test', action: 'watch' });
    assert.equal(watch.success, false);
    assert.ok(watch.output.includes("'progressId' is required"));

    const result = await command.execute({ target: 'test', action: 'result' });
    assert.equal(result.success, false);
    assert.ok(result.output.includes("'resultId' is required"));
  });

  it('should reject suite-only arguments on a single test', async () => {
    const command = new CicdTestCommand(mockProcessor);

    const result = await command.execute({
      target: 'test', action: 'run', testName: 'My Test', isPerformanceRun: true,
    });

    assert.equal(result.success, false);
    assert.ok(result.output.includes('isPerformanceRun'));
    assertNotCalled(mockProcessor.process);
  });

  it('should reject an unsupported browserName', async () => {
    const command = new CicdTestCommand(mockProcessor);

    const result = await command.execute({
      target: 'testsuite', action: 'run', testSuiteName: 'Suite', browserName: 'opera',
    });

    assert.equal(result.success, false);
    assert.ok(result.output.includes('any, chrome, firefox, edge, ie, safari'));
  });

  it('should accept punctuation in suite and test names but reject control characters', async () => {
    const command = new CicdTestCommand(mockProcessor);

    const suiteName = 'Incident (Regression) & Cleanup';
    const ok = await command.execute({ target: 'testsuite', action: 'run', testSuiteName: suiteName });
    assert.equal(ok.success, true);
    const argv = mockProcessor.process.mock.calls[0].arguments[1];
    assert.equal(argv[argv.indexOf('--test-suite-name') + 1], suiteName);

    mockProcessor.process.mock.resetCalls();
    const bad = await command.execute({ target: 'test', action: 'run', testName: 'bad\tname' });
    assert.equal(bad.success, false);
    assert.ok(bad.output.includes('control characters'));
    assertNotCalled(mockProcessor.process);
  });

  it('should fail with an actionable message when no auth alias can be resolved', async () => {
    session.getAuthAlias.mock.mockImplementation(() => undefined);
    const command = new CicdTestCommand(mockProcessor);

    const result = await command.execute({ target: 'testsuite', action: 'result', resultId: 'res-1' });

    assert.equal(result.success, false);
    assert.ok(result.output.includes('now-sdk auth --add'));
    assertNotCalled(mockProcessor.process);
  });

  it('should reject an output format the CLI does not declare', async () => {
    const command = new CicdTestCommand(mockProcessor);

    const result = await command.execute({
      target: 'test', action: 'result', resultId: 'res-1', output: 'table',
    });

    assert.equal(result.success, false);
    assert.ok(result.output.includes('json, raw'));
    assertNotCalled(mockProcessor.process);
  });

  it('should pass a bracket select path through but reject one outside the grammar', async () => {
    const command = new CicdTestCommand(mockProcessor);

    const select = 'result.rollup_results[0].status';
    const ok = await command.execute({ target: 'testsuite', action: 'result', resultId: 'res-1', select });
    assert.equal(ok.success, true);
    const argv = mockProcessor.process.mock.calls[0].arguments[1];
    assert.equal(argv[argv.indexOf('--select') + 1], select);

    mockProcessor.process.mock.resetCalls();
    const bad = await command.execute({
      target: 'testsuite', action: 'result', resultId: 'res-1', select: 'result.*.status',
    });
    assert.equal(bad.success, false);
    assert.ok(bad.output.includes("Argument 'select' must be a dot/bracket path"));
    assertNotCalled(mockProcessor.process);
  });

  // SDK v4.12.0 `cicd test logs`: a single GET with --result-id (required),
  // --pattern (sysparm_regex) and --limit (CLI default 100). It has no `poll`,
  // so the CLI declares no --wait/--poll-timeout on it, and it exists under
  // `test` only — there is no `testsuite logs`.
  describe('logs action (SDK v4.12.0+)', () => {
    it('should build test logs argv with pattern and limit and no polling flags', async () => {
      const command = new CicdTestCommand(mockProcessor);

      const result = await command.execute({
        target: 'test', action: 'logs', resultId: 'res-1', pattern: 'error|fail', limit: 50,
      });

      assert.equal(result.success, true);
      assert.deepStrictEqual(mockProcessor.process.mock.calls[0].arguments[1], [
        SDK_BIN, 'cicd', 'test', 'logs',
        '--result-id', 'res-1',
        '--pattern', 'error|fail',
        '--limit', '50',
        '--auth', 'session-alias',
        '--output', 'json',
      ]);
    });

    it('should let the CLI default the limit and send no pattern when both are omitted', async () => {
      const command = new CicdTestCommand(mockProcessor);

      await command.execute({ target: 'test', action: 'logs', resultId: 'res-1' });

      const argv = mockProcessor.process.mock.calls[0].arguments[1];
      assert.ok(!argv.includes('--pattern'));
      assert.ok(!argv.includes('--limit'));
    });

    it('should accept regex metacharacters in pattern but reject control characters', async () => {
      const command = new CicdTestCommand(mockProcessor);

      const ok = await command.execute({
        target: 'test', action: 'logs', resultId: 'res-1', pattern: '^(Step|Assert)\\s+[0-9]+ failed$',
      });
      assert.equal(ok.success, true);

      mockProcessor.process.mock.resetCalls();
      const bad = await command.execute({ target: 'test', action: 'logs', resultId: 'res-1', pattern: 'error\nfail' });
      assert.equal(bad.success, false);
      assert.ok(bad.output.includes("Invalid characters in argument 'pattern'"));
      assertNotCalled(mockProcessor.process);
    });

    it('should reject logs on a test suite, which the CLI does not offer', async () => {
      const command = new CicdTestCommand(mockProcessor);

      const result = await command.execute({ target: 'testsuite', action: 'logs', resultId: 'res-1' });

      assert.equal(result.success, false);
      assert.ok(result.output.includes('action="logs" is only available with target="test"'));
      assertNotCalled(mockProcessor.process);
    });

    it('should require resultId for logs', async () => {
      const command = new CicdTestCommand(mockProcessor);

      const result = await command.execute({ target: 'test', action: 'logs' });

      assert.equal(result.success, false);
      assert.ok(result.output.includes("Argument 'resultId' is required when action=\"logs\""));
    });

    for (const [label, extra] of [
      ['{"wait": false}', { wait: false }],
      ['{"pollTimeout": 60000}', { pollTimeout: 60000 }],
    ] as const) {
      it(`should reject polling arguments on logs (${label})`, async () => {
        const command = new CicdTestCommand(mockProcessor);

        const result = await command.execute({ target: 'test', action: 'logs', resultId: 'res-1', ...extra });

        assert.equal(result.success, false);
        assert.ok(result.output.includes('not accepted when action="logs"'));
        assertNotCalled(mockProcessor.process);
      });
    }

    for (const [name, value] of [
      ['pattern', 'error'],
      ['limit', 10],
    ] as const) {
      it(`should reject ${name} outside the logs action`, async () => {
        const command = new CicdTestCommand(mockProcessor);

        const result = await command.execute({ target: 'test', action: 'result', resultId: 'res-1', [name]: value });

        assert.equal(result.success, false);
        assert.ok(result.output.includes(`Argument '${name}' is only valid with action="logs"`));
      });
    }

    for (const limit of [0, -1, 2.5]) {
      it(`should reject a non-positive-integer limit (${limit})`, async () => {
        const command = new CicdTestCommand(mockProcessor);

        const result = await command.execute({ target: 'test', action: 'logs', resultId: 'res-1', limit });

        assert.equal(result.success, false);
        assert.ok(result.output.includes("Argument 'limit' must be a positive integer"));
      });
    }

    it('should still send polling flags for run and watch only', async () => {
      const command = new CicdTestCommand(mockProcessor);

      await command.execute({ target: 'test', action: 'watch', progressId: 'p-1', wait: false, pollTimeout: 1000 });

      const argv = mockProcessor.process.mock.calls[0].arguments[1];
      assert.ok(argv.includes('--no-wait'));
      assert.ok(argv.includes('--poll-timeout'));
    });
  });
});
