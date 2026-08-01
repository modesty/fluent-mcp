import { InstallCommand } from '../../src/tools/commands/installCommand.js';
import { TransformCommand } from '../../src/tools/commands/transformCommand.js';
import { ToolsManager } from '../../src/tools/toolsManager.js';
import { SessionManager } from '../../src/utils/sessionManager.js';
import { CommandProcessor } from '../../src/utils/types.js';
import { autoValidateAuthIfConfigured } from '../../src/server/fluentInstanceAuth.js';

jest.mock('../../src/server/fluentInstanceAuth.js', () => ({
  autoValidateAuthIfConfigured: jest.fn(),
}));

const autoValidate = autoValidateAuthIfConfigured as jest.Mock;

function manager(): ToolsManager {
  // No MCP server needed: since the v2 swap, ToolsManager only builds the
  // command registry at construction. Registration is a separate registerOn().
  return new ToolsManager();
}

function processor(): CommandProcessor {
  return {
    process: jest.fn().mockResolvedValue({
      success: true,
      output: 'ok',
      exitCode: 0,
    }),
  };
}

describe('lazy auto-auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SessionManager.getInstance().clearSession();
  });

  it('shares one in-flight validation across concurrent auth-requiring commands', async () => {
    let finishValidation!: () => void;
    autoValidate.mockImplementation(
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
    const ensureAuth = (toolsManager as any).ensureAuthValidated;
    const commandProcessor = processor();
    const deploy = new InstallCommand(commandProcessor, ensureAuth);
    const transform = new TransformCommand(commandProcessor, ensureAuth);

    const deployCall = deploy.execute({ workingDirectory: '/project' });
    const transformCall = transform.execute({ workingDirectory: '/project' });
    await Promise.resolve();

    expect(autoValidate).toHaveBeenCalledTimes(1);
    expect(commandProcessor.process).not.toHaveBeenCalled();

    finishValidation();
    await Promise.all([deployCall, transformCall]);

    expect(commandProcessor.process).toHaveBeenCalledTimes(2);
    for (const call of (commandProcessor.process as jest.Mock).mock.calls) {
      expect(call[1]).toEqual(expect.arrayContaining(['--auth', 'validated-alias']));
    }
  });

  it('bypasses auto-validation when auth is explicit', async () => {
    const ensureAuth = jest.fn().mockResolvedValue(undefined);
    const commandProcessor = processor();
    const deploy = new InstallCommand(commandProcessor, ensureAuth);

    await deploy.execute({
      auth: 'explicit-alias',
      workingDirectory: '/project',
    });

    expect(ensureAuth).not.toHaveBeenCalled();
    expect((commandProcessor.process as jest.Mock).mock.calls[0][1]).toEqual(
      expect.arrayContaining(['--auth', 'explicit-alias'])
    );
  });

  it('does not validate auth for a local transform', async () => {
    const ensureAuth = jest.fn().mockResolvedValue(undefined);
    const commandProcessor = processor();
    const transform = new TransformCommand(commandProcessor, ensureAuth);

    await transform.execute({
      from: '/tmp/local-update-set.xml',
      workingDirectory: '/project',
    });

    expect(ensureAuth).not.toHaveBeenCalled();
    expect((commandProcessor.process as jest.Mock).mock.calls[0][1]).not.toContain('--auth');
  });

  it('honors an explicit auth alias for a local transform without lazy validation', async () => {
    const ensureAuth = jest.fn().mockResolvedValue(undefined);
    const commandProcessor = processor();
    const transform = new TransformCommand(commandProcessor, ensureAuth);

    await transform.execute({
      from: '/tmp/local-update-set.xml',
      auth: 'explicit-local-alias',
      workingDirectory: '/project',
    });

    expect(ensureAuth).not.toHaveBeenCalled();
    expect((commandProcessor.process as jest.Mock).mock.calls[0][1]).toEqual(
      expect.arrayContaining(['--auth', 'explicit-local-alias'])
    );
  });

  it('memoizes a failed validation instead of racing or retrying', async () => {
    autoValidate.mockRejectedValue(new Error('validation unavailable'));
    const toolsManager = manager();
    const ensureAuth = (toolsManager as any).ensureAuthValidated;

    await Promise.all([ensureAuth(), ensureAuth()]);
    await ensureAuth();

    expect(autoValidate).toHaveBeenCalledTimes(1);
  });
});
