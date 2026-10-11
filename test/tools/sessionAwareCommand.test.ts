import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledWith, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor, CommandResult } from '../../src/utils/types.js';

// Session replacement: the working-directory chain reads the initialized session
// first, so each test pins what the session reports.
const session = {
  getWorkingDirectory: mock.fn((): string | undefined => '/session/project'),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(),
  setAuthValidationResult: mock.fn(),
};

// getConfig supplies the FLUENT_MCP_WORKING_DIR rung of the chain; each test sets
// the configuration it needs.
const config = configFixture();
type Config = ReturnType<typeof config.getConfig>;
function setConfig(value: Record<string, unknown>): void {
  config.getConfig.mock.mockImplementation(() => value as unknown as Config);
}

mock.module('../../src/config.js', config.mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => session } },
});

const { SessionAwareCLICommand, WORKING_DIRECTORY_ARGUMENT } = await import(
  '../../src/tools/commands/sessionAwareCommand.js'
);

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessFn = CommandProcessor['process'];

class TestSessionAwareCommand extends SessionAwareCLICommand {
  name = 'test_command';
  description = 'Test command for session-aware commands';
  arguments = [WORKING_DIRECTORY_ARGUMENT];

  async execute(args: Record<string, unknown>): Promise<CommandResult> {
    return this.executeSdkCommand('test', args);
  }
}

describe('SessionAwareCLICommand working-directory resolution', () => {
  let command: TestSessionAwareCommand;
  let processor: { process: ReturnType<typeof mock.fn<ProcessFn>> };

  /** Asserts the processor ran once, in `cwd`, with no stdin, timeout, or signal. */
  function assertRanIn(cwd: string): void {
    const [bin, argv, workingDirectory, stdinInput, timeoutMs, signal] = processor.process.mock.calls[0].arguments;
    assert.equal(typeof bin, 'string');
    assert.ok(Array.isArray(argv));
    assert.equal(workingDirectory, cwd);
    assert.equal(stdinInput, undefined);
    assert.equal(timeoutMs, undefined);
    assert.equal(signal, undefined);
  }

  beforeEach(() => {
    session.getWorkingDirectory.mock.resetCalls();
    processor = {
      process: mock.fn<ProcessFn>(async () => ({
        success: true,
        output: 'ok',
        exitCode: 0,
      })),
    };
    command = new TestSessionAwareCommand(processor);
    session.getWorkingDirectory.mock.mockImplementation(() => '/session/project');
    setConfig({
      logLevel: 'info',
      resourcePaths: {},
      servicenowSdk: {},
    });
  });

  it('uses an explicit absolute tool argument before every fallback', async () => {
    const result = await command.execute({ workingDirectory: '/explicit/project' });

    assert.equal(result.success, true);
    assertCalledWith(
      processor.process,
      process.execPath,
      [SDK_BIN, 'test'],
      '/explicit/project',
      undefined,
      undefined,
      undefined
    );
    assertNotCalled(session.getWorkingDirectory);
  });

  it('uses the initialized session when no explicit argument exists', async () => {
    await command.execute({});

    assertRanIn('/session/project');
  });

  it('uses FLUENT_MCP_WORKING_DIR after an empty session', async () => {
    session.getWorkingDirectory.mock.mockImplementation(() => undefined);
    setConfig({
      workingDirectory: '/configured/project',
    });

    await command.execute({});

    assertRanIn('/configured/project');
  });

  for (const [label, value] of [
    ['null', null],
    ['empty string', ''],
    ['whitespace-only string', '   '],
  ] as const) {
    it(`treats an explicit ${label} workingDirectory as absent and continues fallback resolution`, async () => {
      session.getWorkingDirectory.mock.mockImplementation(() => undefined);
      setConfig({ workingDirectory: '/configured/project' });

      await command.execute({ workingDirectory: value });

      assertRanIn('/configured/project');
    });
  }

  // MCP 2026-07-28 deprecated Roots and removed the server-initiated roots/list
  // request that populated it, so the chain is exactly three rungs and then a
  // refusal. There is deliberately no process.cwd() or installed-package guess:
  // a command that refuses beats one that runs against the wrong tree.
  it('fails closed with actionable configuration when no source resolves', async () => {
    session.getWorkingDirectory.mock.mockImplementation(() => undefined);

    const result = await command.execute({});

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes("'workingDirectory' tool argument"));
    assert.ok(result.error?.message.includes('FLUENT_MCP_WORKING_DIR'));
    assertNotCalled(processor.process);
  });

  it('never falls back to MCP Roots, process.cwd(), or the package directory', async () => {
    session.getWorkingDirectory.mock.mockImplementation(() => undefined);

    const result = await command.execute({});

    // The only outcome with no explicit/session/configured directory is refusal.
    assert.equal(result.success, false);
    assertNotCalled(processor.process);
    // In particular it must not silently adopt the server's own cwd.
    assert.ok(result.error);
    assert.ok(!result.error.message.includes(process.cwd()));
  });

  for (const [name, args, cfg] of [
    ['relative explicit path', { workingDirectory: 'relative/project' }, {}],
    ['filesystem root', { workingDirectory: '/' }, {}],
    ['relative configured path', {}, { workingDirectory: 'relative/project' }],
  ] as const) {
    it(`rejects ${name} instead of falling through`, async () => {
      session.getWorkingDirectory.mock.mockImplementation(() => undefined);
      setConfig(cfg);

      const result = await command.execute(args);

      assert.equal(result.success, false);
      assert.match(result.error?.message ?? '', /absolute path|filesystem root/);
      assertNotCalled(processor.process);
    });
  }

  it('never forwards workingDirectory as SDK argv', async () => {
    await command.execute({ workingDirectory: '/explicit/project' });

    const sdkArgs = processor.process.mock.calls[0].arguments[1];
    assert.ok(!sdkArgs.includes('workingDirectory'));
    assert.ok(!sdkArgs.includes('/explicit/project'));
  });

  it('normalizes processor exceptions into command errors', async () => {
    processor.process.mock.mockImplementationOnce(async () => {
      throw new Error('Test execution error');
    });

    const result = await command.execute({});

    assert.equal(result.success, false);
    assert.equal(result.error?.message, 'Test execution error');
  });
});
