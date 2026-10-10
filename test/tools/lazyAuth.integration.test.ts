import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledTimes, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor, EnsureAuthValidated } from '../../src/utils/types.js';

// Auto-validation is the unit under observation, so it is replaced with a mock
// whose behaviour each test supplies. Everything else is real: the commands,
// ToolsManager's single-flight memo, and the SessionManager singleton.
const autoValidate = mock.fn<(owner?: unknown) => Promise<unknown>>();
mock.module('../../src/server/fluentInstanceAuth.js', {
  namedExports: { autoValidateAuthIfConfigured: autoValidate },
});

// Logging is silenced and SDK CLI resolution is pinned for this suite.
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);

const { InstallCommand } = await import('../../src/tools/commands/installCommand.js');
const { TransformCommand } = await import('../../src/tools/commands/transformCommand.js');
const { ToolsManager } = await import('../../src/tools/toolsManager.js');
const { SessionManager } = await import('../../src/utils/sessionManager.js');

type ProcessFn = CommandProcessor['process'];

function manager(): InstanceType<typeof ToolsManager> {
  // No MCP server needed: since the v2 swap, ToolsManager only builds the
  // command registry at construction. Registration is a separate registerOn().
  return new ToolsManager();
}

/** ToolsManager's private single-flight auth trigger, as the commands receive it. */
function ensureAuthOf(toolsManager: InstanceType<typeof ToolsManager>): EnsureAuthValidated {
  return (toolsManager as unknown as { ensureAuthValidated: EnsureAuthValidated }).ensureAuthValidated;
}

function processor() {
  return {
    process: mock.fn<ProcessFn>(async () => ({
      success: true,
      output: 'ok',
      exitCode: 0,
    })),
  };
}

function ensureAuthSpy() {
  return mock.fn<EnsureAuthValidated>(async () => undefined);
}

describe('lazy auto-auth', () => {
  beforeEach(() => {
    // restore() drops an implementation a previous test installed.
    autoValidate.mock.restore();
    autoValidate.mock.resetCalls();
    SessionManager.getInstance().clearSession();
  });

  afterEach(() => {
    SessionManager.getInstance().clearSession();
  });

  it('shares one in-flight validation across concurrent auth-requiring commands', async () => {
    let finishValidation!: () => void;
    autoValidate.mock.mockImplementation(
      () => new Promise((resolve) => {
        finishValidation = () => {
          SessionManager.getInstance().setAuthAlias('validated-alias');
          resolve({
            status: 'authenticated',
            message: 'validated',
            timestamp: '2026-07-29T00:00:00.000Z',
          });
        };
      })
    );

    const toolsManager = manager();
    const ensureAuth = ensureAuthOf(toolsManager);
    const commandProcessor = processor();
    const deploy = new InstallCommand(commandProcessor, ensureAuth);
    const transform = new TransformCommand(commandProcessor, ensureAuth);

    const deployCall = deploy.execute({ workingDirectory: '/project' });
    const transformCall = transform.execute({ workingDirectory: '/project' });
    await Promise.resolve();

    assertCalledTimes(autoValidate, 1);
    assertNotCalled(commandProcessor.process);

    finishValidation();
    await Promise.all([deployCall, transformCall]);

    assertCalledTimes(commandProcessor.process, 2);
    for (const call of commandProcessor.process.mock.calls) {
      const argv = call.arguments[1];
      assert.ok(argv.includes('--auth'));
      assert.ok(argv.includes('validated-alias'));
    }
  });

  it('bypasses auto-validation when auth is explicit', async () => {
    const ensureAuth = ensureAuthSpy();
    const commandProcessor = processor();
    const deploy = new InstallCommand(commandProcessor, ensureAuth);

    await deploy.execute({
      auth: 'explicit-alias',
      workingDirectory: '/project',
    });

    assertNotCalled(ensureAuth);
    const argv = commandProcessor.process.mock.calls[0].arguments[1];
    assert.ok(argv.includes('--auth'));
    assert.ok(argv.includes('explicit-alias'));
  });

  it('does not validate auth for a local transform', async () => {
    const ensureAuth = ensureAuthSpy();
    const commandProcessor = processor();
    const transform = new TransformCommand(commandProcessor, ensureAuth);

    await transform.execute({
      from: '/tmp/local-update-set.xml',
      workingDirectory: '/project',
    });

    assertNotCalled(ensureAuth);
    assert.ok(!commandProcessor.process.mock.calls[0].arguments[1].includes('--auth'));
  });

  it('rejects an explicit auth alias on a local transform without validating or spawning', async () => {
    // The CLI declares `.conflicts('from', ['mode', 'auth'])`, so forwarding the
    // alias would only trade this message for a yargs failure after spawn.
    const ensureAuth = ensureAuthSpy();
    const commandProcessor = processor();
    const transform = new TransformCommand(commandProcessor, ensureAuth);

    await assert.rejects(
      transform.execute({
        from: '/tmp/local-update-set.xml',
        auth: 'explicit-local-alias',
        workingDirectory: '/project',
      }),
      /Arguments 'from' and 'auth' cannot be combined/
    );

    assertNotCalled(ensureAuth);
    assertNotCalled(commandProcessor.process);
  });

  it('memoizes a failed validation instead of racing or retrying', async () => {
    autoValidate.mock.mockImplementation(async () => {
      throw new Error('validation unavailable');
    });
    const toolsManager = manager();
    const ensureAuth = ensureAuthOf(toolsManager);

    await Promise.all([ensureAuth(), ensureAuth()]);
    await ensureAuth();

    assertCalledTimes(autoValidate, 1);
  });
});
