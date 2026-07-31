import { getConfig } from '../../src/config.js';
import {
  SessionAwareCLICommand,
  WORKING_DIRECTORY_ARGUMENT,
} from '../../src/tools/commands/sessionAwareCommand.js';
import { SessionManager } from '../../src/utils/sessionManager.js';
import { CommandProcessor, CommandResult } from '../../src/utils/types.js';

jest.mock('../../src/utils/sessionManager.js', () => require('../mocks/index.js').createSessionManagerMock());
jest.mock('../../src/utils/rootContext.js', () => require('../mocks/index.js').createRootContextMock());

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
  let processor: CommandProcessor;
  let session: ReturnType<typeof SessionManager.getInstance>;
  let resolveRoot: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = {
      process: jest.fn().mockResolvedValue({
        success: true,
        output: 'ok',
        exitCode: 0,
      }),
    };
    command = new TestSessionAwareCommand(processor);
    session = SessionManager.getInstance();
    (session.getWorkingDirectory as jest.Mock).mockReturnValue('/session/project');
    ({ resolveWorkingDirectory: resolveRoot } = require('../../src/utils/rootContext.js'));
    resolveRoot.mockReturnValue('/root/project');
    (getConfig as jest.Mock).mockReturnValue({
      logLevel: 'info',
      resourcePaths: {},
      servicenowSdk: {},
    });
  });

  it('uses an explicit absolute tool argument before every fallback', async () => {
    const result = await command.execute({ workingDirectory: '/explicit/project' });

    expect(result.success).toBe(true);
    expect(processor.process).toHaveBeenCalledWith(
      process.execPath,
      ['/test/node_modules/@servicenow/sdk/bin/index.js', 'test'],
      false,
      '/explicit/project',
      undefined,
      undefined,
      undefined
    );
    expect(session.getWorkingDirectory).not.toHaveBeenCalled();
  });

  it('uses the initialized session when no explicit argument exists', async () => {
    await command.execute({});

    expect(processor.process).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      false,
      '/session/project',
      undefined,
      undefined,
      undefined
    );
  });

  it('uses FLUENT_MCP_WORKING_DIR after an empty session', async () => {
    (session.getWorkingDirectory as jest.Mock).mockReturnValue(undefined);
    (getConfig as jest.Mock).mockReturnValue({
      workingDirectory: '/configured/project',
    });

    await command.execute({});

    expect(processor.process).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      false,
      '/configured/project',
      undefined,
      undefined,
      undefined
    );
    expect(resolveRoot).not.toHaveBeenCalled();
  });

  it('uses transitional MCP Roots only after explicit, session, and config are absent', async () => {
    (session.getWorkingDirectory as jest.Mock).mockReturnValue(undefined);

    await command.execute({});

    expect(processor.process).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      false,
      '/root/project',
      undefined,
      undefined,
      undefined
    );
  });

  it.each([
    ['null', null],
    ['empty string', ''],
    ['whitespace-only string', '   '],
  ])('treats an explicit %s workingDirectory as absent and continues fallback resolution', async (_label, value) => {
    (session.getWorkingDirectory as jest.Mock).mockReturnValue(undefined);

    await command.execute({ workingDirectory: value });

    expect(processor.process).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      false,
      '/root/project',
      undefined,
      undefined,
      undefined
    );
  });

  it('fails closed with actionable configuration when no source resolves', async () => {
    (session.getWorkingDirectory as jest.Mock).mockReturnValue(undefined);
    resolveRoot.mockReturnValue(undefined);

    const result = await command.execute({});

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("'workingDirectory' tool argument");
    expect(result.error?.message).toContain('FLUENT_MCP_WORKING_DIR');
    expect(processor.process).not.toHaveBeenCalled();
  });

  it.each([
    ['relative explicit path', { workingDirectory: 'relative/project' }, {}],
    ['filesystem root', { workingDirectory: '/' }, {}],
    ['relative configured path', {}, { workingDirectory: 'relative/project' }],
  ])('rejects %s instead of falling through', async (_name, args, config) => {
    (session.getWorkingDirectory as jest.Mock).mockReturnValue(undefined);
    (getConfig as jest.Mock).mockReturnValue(config);

    const result = await command.execute(args);

    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/absolute path|filesystem root/);
    expect(resolveRoot).not.toHaveBeenCalled();
    expect(processor.process).not.toHaveBeenCalled();
  });

  it('never forwards workingDirectory as SDK argv', async () => {
    await command.execute({ workingDirectory: '/explicit/project' });

    const sdkArgs = (processor.process as jest.Mock).mock.calls[0][1];
    expect(sdkArgs).not.toContain('workingDirectory');
    expect(sdkArgs).not.toContain('/explicit/project');
  });

  it('normalizes processor exceptions into command errors', async () => {
    (processor.process as jest.Mock).mockRejectedValueOnce(new Error('Test execution error'));

    const result = await command.execute({});

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Test execution error');
  });
});
