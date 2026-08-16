/**
 * Tests for the SDK v4.10.0 `cicd` command wrappers (CicdAppCommand,
 * CicdTestCommand). Verifies metadata and risk annotations, nested-subcommand
 * argv construction, the `--no-wait` negation (the flag defaults to true in the
 * CLI, so only the negation is meaningful), the required-authentication gate,
 * and the per-leaf argument legality checks that keep an unusable combination
 * from reaching the CLI as an opaque failure.
 */
import { CicdAppCommand } from '../../src/tools/commands/cicdAppCommand.js';
import { CicdTestCommand } from '../../src/tools/commands/cicdTestCommand.js';
import { SessionManager } from '../../src/utils/sessionManager.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());
// Default the session to a resolvable auth alias so the required-auth gate passes;
// individual tests override getAuthAlias to exercise the unauthenticated path.
jest.mock('../../src/utils/sessionManager.js', () =>
  require('../mocks/index.js').createSessionManagerMock({
    getAuthAlias: jest.fn().mockReturnValue('session-alias'),
  })
);

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

describe('CicdAppCommand', () => {
  let mockProcessor: { process: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    (SessionManager.getInstance().getAuthAlias as jest.Mock).mockReturnValue('session-alias');
    mockProcessor = {
      process: jest.fn().mockResolvedValue({ success: true, output: '{"ok":true}', exitCode: 0 }),
    };
  });

  test('should expose destructive metadata with action as the only required argument', () => {
    const command = new CicdAppCommand(mockProcessor as never);
    expect(command.name).toBe('cicd_fluent_app');
    expect(command.annotations.destructiveHint).toBe(true);
    expect(command.annotations.idempotentHint).toBe(false);
    expect(command.annotations.openWorldHint).toBe(true);

    const required = command.arguments.filter((a) => a.required).map((a) => a.name);
    expect(required).toEqual(['action']);
  });

  test('should cover the poll window so the CLI reports its own timeout first', () => {
    const command = new CicdAppCommand(mockProcessor as never);
    // The CLI polls for up to 900_000 ms by default; the runner timeout must sit
    // above it, or the child is killed before the CLI can report cleanly.
    expect(command.timeoutMs).toBeGreaterThan(900_000);
  });

  test('should build install argv with the subcommand token, JSON envelope, and session auth', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    const result = await command.execute({ action: 'install', appSysId: 'abc123', appVersion: '1.0.0' });

    expect(result.success).toBe(true);
    expect(mockProcessor.process).toHaveBeenCalledWith(
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

  test('should emit the --no-wait negation rather than dropping a false value', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    await command.execute({ action: 'publish', scope: 'x_myco_app', wait: false });

    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv).toContain('--no-wait');
    expect(argv).not.toContain('--wait');
  });

  test('should pass publish-only and install-only flags through', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    await command.execute({ action: 'publish', scope: 'x_myco_app', devNotes: 'release notes' });
    expect(mockProcessor.process.mock.calls[0][1]).toContain('--dev-notes');

    mockProcessor.process.mockClear();
    await command.execute({ action: 'install', scope: 'x_myco_app', autoUpgradeBaseApp: true });
    expect(mockProcessor.process.mock.calls[0][1]).toContain('--auto-upgrade-base-app');
  });

  test('should reject an unknown action instead of interpolating it into argv', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    const result = await command.execute({ action: 'uninstall' });

    expect(result.success).toBe(false);
    expect(result.output).toContain('install, publish, rollback');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject scope and appSysId together', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    const result = await command.execute({ action: 'install', scope: 'x_myco_app', appSysId: 'abc123' });

    expect(result.success).toBe(false);
    expect(result.output).toContain('mutually exclusive');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should require appVersion for rollback', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    const result = await command.execute({ action: 'rollback', appSysId: 'abc123' });

    expect(result.success).toBe(false);
    expect(result.output).toContain("'appVersion' is required");
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject install-only arguments on a non-install action', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    const result = await command.execute({ action: 'publish', scope: 'x_myco_app', baseAppVersion: '2.0.0' });

    expect(result.success).toBe(false);
    expect(result.output).toContain('baseAppVersion');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should accept punctuation in devNotes but reject control characters', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    // Release notes routinely contain punctuation the base shell-metacharacter
    // check rejects; it is inert on the shell-free path and must pass through.
    const notes = 'Fixes (SN-123); adds retry & backoff';
    const ok = await command.execute({ action: 'publish', scope: 'x_myco_app', devNotes: notes });
    expect(ok.success).toBe(true);
    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv[argv.indexOf('--dev-notes') + 1]).toBe(notes);

    mockProcessor.process.mockClear();
    const bad = await command.execute({ action: 'publish', scope: 'x_myco_app', devNotes: 'line1\nline2' });
    expect(bad.success).toBe(false);
    expect(bad.output).toContain('control characters');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should fail with an actionable message when no auth alias can be resolved', async () => {
    (SessionManager.getInstance().getAuthAlias as jest.Mock).mockReturnValue(undefined);
    const command = new CicdAppCommand(mockProcessor as never);

    const result = await command.execute({ action: 'install', appSysId: 'abc123' });

    expect(result.success).toBe(false);
    expect(result.output).toContain('now-sdk auth --add');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject an output format the CLI does not declare', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    const result = await command.execute({ action: 'install', appSysId: 'abc123', output: 'yaml' });

    expect(result.success).toBe(false);
    expect(result.output).toContain('json, raw');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should pass a bracket select path through to --select', async () => {
    const command = new CicdAppCommand(mockProcessor as never);

    await command.execute({
      action: 'install', appSysId: 'abc123', select: 'result.links.results[0].id',
    });

    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv[argv.indexOf('--select') + 1]).toBe('result.links.results[0].id');
  });

  describe('without a Fluent project directory', () => {
    beforeEach(() => {
      (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValue(undefined);
    });

    afterEach(() => {
      (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValue('/mock/working/dir');
    });

    // The CLI defaults --app-version from the cwd's package.json. Outside a Fluent
    // project the only cwd available is the MCP server's own install directory, so
    // an inferred version would be this server's version, not the app's.
    test.each(['install', 'publish'])(
      'should require appVersion rather than let the CLI infer this server version (%s)',
      async (action) => {
        const command = new CicdAppCommand(mockProcessor as never);

        const result = await command.execute({ action, scope: 'x_myco_app' });

        expect(result.success).toBe(false);
        expect(result.output).toContain("requires 'appVersion'");
        expect(mockProcessor.process).not.toHaveBeenCalled();
      }
    );

    test('should proceed once the application and version are both explicit', async () => {
      const command = new CicdAppCommand(mockProcessor as never);

      const result = await command.execute({
        action: 'install', scope: 'x_myco_app', appVersion: '2.1.0',
      });

      expect(result.success).toBe(true);
      const [, argv, cwd] = mockProcessor.process.mock.calls[0];
      expect(argv).toContain('--app-version');
      expect(argv).toContain('2.1.0');
      // Neutral cwd only: both project-derived defaults were supplied explicitly.
      expect(cwd).toBe('/mock/project/root');
    });

    test('should still name the identifier as the first missing piece', async () => {
      const command = new CicdAppCommand(mockProcessor as never);

      const result = await command.execute({ action: 'install' });

      expect(result.success).toBe(false);
      expect(result.output).toContain('could not identify the application');
      expect(mockProcessor.process).not.toHaveBeenCalled();
    });
  });
});

describe('CicdTestCommand', () => {
  let mockProcessor: { process: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    (SessionManager.getInstance().getAuthAlias as jest.Mock).mockReturnValue('session-alias');
    mockProcessor = {
      process: jest.fn().mockResolvedValue({ success: true, output: '{"ok":true}', exitCode: 0 }),
    };
  });

  // `run` executes real ATF steps, which create/update/delete records under the
  // runner's impersonation. Annotations are per-tool, so the annotation must follow
  // the widest blast radius the tool can reach rather than its read-only leaves.
  test('should expose destructive metadata requiring target and action', () => {
    const command = new CicdTestCommand(mockProcessor as never);
    expect(command.name).toBe('cicd_fluent_test');
    expect(command.annotations.destructiveHint).toBe(true);
    expect(command.annotations.openWorldHint).toBe(true);

    const required = command.arguments.filter((a) => a.required).map((a) => a.name);
    expect(required).toEqual(['target', 'action']);
  });

  // These leaves read nothing from the project, so no working directory is
  // accepted: a broken FLUENT_MCP_WORKING_DIR must not block a result lookup.
  test('should not depend on a Fluent project directory', async () => {
    (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValue('relative/not/absolute');
    const command = new CicdTestCommand(mockProcessor as never);

    expect(command.arguments.some((a) => a.name === 'workingDirectory')).toBe(false);

    const result = await command.execute({ target: 'test', action: 'result', resultId: 'res-1' });

    expect(result.success).toBe(true);
    expect(mockProcessor.process.mock.calls[0][2]).toBe('/mock/project/root');
    (SessionManager.getInstance().getWorkingDirectory as jest.Mock).mockReturnValue('/mock/working/dir');
  });

  test('should build testsuite run argv with both nested subcommand tokens', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    const result = await command.execute({
      target: 'testsuite',
      action: 'run',
      testSuiteName: 'Regression Suite',
    });

    expect(result.success).toBe(true);
    expect(mockProcessor.process).toHaveBeenCalledWith(
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

  test('should build test watch argv from a progressId', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    await command.execute({ target: 'test', action: 'watch', progressId: 'prog-1' });

    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv.slice(0, 4)).toEqual([SDK_BIN, 'cicd', 'test', 'watch']);
    expect(argv).toContain('--progress-id');
    expect(argv).toContain('prog-1');
  });

  test('should omit both polling flags for the result leaf, which is a plain read', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    await command.execute({ target: 'testsuite', action: 'result', resultId: 'res-1' });

    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv).toContain('--result-id');
    expect(argv).not.toContain('--wait');
    expect(argv).not.toContain('--no-wait');
    expect(argv).not.toContain('--poll-timeout');
  });

  test('should reject unknown target and action tokens', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    const badTarget = await command.execute({ target: 'suite', action: 'run' });
    expect(badTarget.success).toBe(false);
    expect(badTarget.output).toContain('testsuite, test');

    const badAction = await command.execute({ target: 'test', action: 'rerun' });
    expect(badAction.success).toBe(false);
    expect(badAction.output).toContain('run, watch, result');

    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should require an identifier to run, and reject both at once', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    const missing = await command.execute({ target: 'testsuite', action: 'run' });
    expect(missing.success).toBe(false);
    expect(missing.output).toContain("either 'testSuiteSysId' or 'testSuiteName'");

    const both = await command.execute({
      target: 'test', action: 'run', testSysId: 'a', testName: 'b',
    });
    expect(both.success).toBe(false);
    expect(both.output).toContain('mutually exclusive');
  });

  test('should require progressId for watch and resultId for result', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    const watch = await command.execute({ target: 'test', action: 'watch' });
    expect(watch.success).toBe(false);
    expect(watch.output).toContain("'progressId' is required");

    const result = await command.execute({ target: 'test', action: 'result' });
    expect(result.success).toBe(false);
    expect(result.output).toContain("'resultId' is required");
  });

  test('should reject suite-only arguments on a single test', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    const result = await command.execute({
      target: 'test', action: 'run', testName: 'My Test', isPerformanceRun: true,
    });

    expect(result.success).toBe(false);
    expect(result.output).toContain('isPerformanceRun');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject an unsupported browserName', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    const result = await command.execute({
      target: 'testsuite', action: 'run', testSuiteName: 'Suite', browserName: 'opera',
    });

    expect(result.success).toBe(false);
    expect(result.output).toContain('any, chrome, firefox, edge, ie, safari');
  });

  test('should accept punctuation in suite and test names but reject control characters', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    const suiteName = 'Incident (Regression) & Cleanup';
    const ok = await command.execute({ target: 'testsuite', action: 'run', testSuiteName: suiteName });
    expect(ok.success).toBe(true);
    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv[argv.indexOf('--test-suite-name') + 1]).toBe(suiteName);

    mockProcessor.process.mockClear();
    const bad = await command.execute({ target: 'test', action: 'run', testName: 'bad\tname' });
    expect(bad.success).toBe(false);
    expect(bad.output).toContain('control characters');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should fail with an actionable message when no auth alias can be resolved', async () => {
    (SessionManager.getInstance().getAuthAlias as jest.Mock).mockReturnValue(undefined);
    const command = new CicdTestCommand(mockProcessor as never);

    const result = await command.execute({ target: 'testsuite', action: 'result', resultId: 'res-1' });

    expect(result.success).toBe(false);
    expect(result.output).toContain('now-sdk auth --add');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should reject an output format the CLI does not declare', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    const result = await command.execute({
      target: 'test', action: 'result', resultId: 'res-1', output: 'table',
    });

    expect(result.success).toBe(false);
    expect(result.output).toContain('json, raw');
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });

  test('should pass a bracket select path through but reject one outside the grammar', async () => {
    const command = new CicdTestCommand(mockProcessor as never);

    const select = 'result.rollup_results[0].status';
    const ok = await command.execute({ target: 'testsuite', action: 'result', resultId: 'res-1', select });
    expect(ok.success).toBe(true);
    const argv = mockProcessor.process.mock.calls[0][1] as string[];
    expect(argv[argv.indexOf('--select') + 1]).toBe(select);

    mockProcessor.process.mockClear();
    const bad = await command.execute({
      target: 'testsuite', action: 'result', resultId: 'res-1', select: 'result.*.status',
    });
    expect(bad.success).toBe(false);
    expect(bad.output).toContain("Argument 'select' must be a dot/bracket path");
    expect(mockProcessor.process).not.toHaveBeenCalled();
  });
});
