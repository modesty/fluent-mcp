/**
 * Tests for `fluent_transform` against the SDK v4.13.6 `now-sdk transform`
 * builder (`sdk-cli/dist/command/transform`): its three modes, the yargs
 * `.check()`/`.conflicts()` rules mirrored up front, and the `force`/`format`
 * flags the CLI has declared since before 4.11.2 but the tool never exposed.
 */
import { TransformCommand } from '../../src/tools/commands/index.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());
jest.mock('../../src/utils/sessionManager.js', () => require('../mocks/index.js').createSessionManagerMock());

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

describe('TransformCommand (SDK v4.13.6 transform)', () => {
  let mockProcessor: { process: jest.Mock };
  let ensureAuth: jest.Mock;
  let command: TransformCommand;

  const argvOf = (call = 0): string[] => mockProcessor.process.mock.calls[call][1];

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessor = {
      process: jest.fn().mockResolvedValue({ success: true, output: 'ok', exitCode: 0 }),
    };
    ensureAuth = jest.fn().mockResolvedValue(undefined);
    command = new TransformCommand(mockProcessor as never, ensureAuth);
  });

  describe('metadata', () => {
    it('exposes force and format alongside the existing arguments', () => {
      expect(command.arguments.map((arg) => arg.name)).toEqual([
        'workingDirectory', 'from', 'directory', 'auth', 'table', 'id', 'force', 'format', 'timeoutSeconds', 'debug',
      ]);
      const byName = Object.fromEntries(command.arguments.map((arg) => [arg.name, arg]));
      expect(byName.force.type).toBe('boolean');
      expect(byName.format.type).toBe('boolean');
    });

    it('describes table without id as a local filter, not an instance pull', () => {
      // The developing-apps guide says --table scopes an instance pull; the
      // orchestrator's resolveTableTransformFiles only ever reads local XML.
      expect(command.description).toContain('table without id only filters local XML');
      expect(command.description).toContain('it does not download');
      const table = command.arguments.find((arg) => arg.name === 'table');
      expect(table?.description).toContain('no download');
    });

    it('states the from/auth and from/id exclusions where the caller reads them', () => {
      expect(command.description).toContain('cannot be combined with auth or id');
      const from = command.arguments.find((arg) => arg.name === 'from');
      expect(from?.description).toContain('cannot be combined with auth or id');
    });

    it('stays destructive and open-world', () => {
      expect(command.annotations).toEqual({ openWorldHint: true, destructiveHint: true });
    });
  });

  describe('modes', () => {
    it('full-application pull maps auth and runs lazy auth discovery', async () => {
      await command.execute({ workingDirectory: '/project' });
      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(argvOf()[0]).toBe(SDK_BIN);
      expect(argvOf()[1]).toBe('transform');
    });

    it('an explicit alias on an instance pull is forwarded without discovery', async () => {
      await command.execute({ workingDirectory: '/project', auth: 'dev' });
      expect(ensureAuth).not.toHaveBeenCalled();
      expect(argvOf()).toEqual(expect.arrayContaining(['--auth', 'dev']));
    });

    it('a from transform is offline: no auth flag and no discovery', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata/update' });
      expect(ensureAuth).not.toHaveBeenCalled();
      expect(argvOf()).toEqual(expect.arrayContaining(['--from', 'metadata/update']));
      expect(argvOf()).not.toContain('--auth');
    });

    it('table with id pulls one record from the instance', async () => {
      await command.execute({ workingDirectory: '/project', auth: 'dev', table: 'sys_script', id: 'abc123' });
      expect(argvOf()).toEqual(expect.arrayContaining(['--table', 'sys_script', '--id', 'abc123', '--auth', 'dev']));
    });

    it('table without from still maps auth, because only --from marks the CLI run offline', async () => {
      await command.execute({ workingDirectory: '/project', table: 'sys_script' });
      expect(ensureAuth).toHaveBeenCalledTimes(1);
      expect(argvOf()).toEqual(expect.arrayContaining(['--table', 'sys_script']));
    });

    it('table with from narrows a local transform without auth', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata', table: 'sys_script,sys_script_include' });
      expect(ensureAuth).not.toHaveBeenCalled();
      expect(argvOf()).toEqual(expect.arrayContaining(['--from', 'metadata', '--table', 'sys_script,sys_script_include']));
      expect(argvOf()).not.toContain('--auth');
    });
  });

  describe('force and format flags', () => {
    it('force: true emits --force', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata', table: 'sys_script', force: true });
      expect(argvOf()).toContain('--force');
    });

    it('force: false emits nothing (CLI default false)', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata', force: false });
      expect(argvOf()).not.toContain('--force');
    });

    it('format: false emits the yargs negation --no-format', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata', format: false });
      expect(argvOf()).toContain('--no-format');
      expect(argvOf()).not.toContain('--format');
    });

    it('format omitted leaves the CLI default (true) in place', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata' });
      expect(argvOf().some((token) => token.endsWith('format'))).toBe(false);
    });
  });

  describe('CLI combination rules, rejected before spawning', () => {
    it.each([
      ['from + auth', { from: 'metadata', auth: 'dev' }, "Arguments 'from' and 'auth' cannot be combined"],
      ['id without table', { auth: 'dev', id: 'abc123' }, "Argument 'id' requires 'table'"],
      ['from + id', { from: 'metadata', table: 'sys_script', id: 'abc123' }, "Arguments 'from' and 'id' cannot be combined"],
      ['force without table', { from: 'metadata', force: true }, "Argument 'force' requires 'table'"],
    ])('%s', async (_label, args, message) => {
      await expect(command.execute({ workingDirectory: '/project', ...args })).rejects.toThrow(message);
      expect(ensureAuth).not.toHaveBeenCalled();
      expect(mockProcessor.process).not.toHaveBeenCalled();
    });

    it('treats an empty-string from as absent, matching the flag map', async () => {
      await command.execute({ workingDirectory: '/project', from: '', auth: 'dev' });
      expect(argvOf()).toEqual(expect.arrayContaining(['--auth', 'dev']));
      expect(argvOf()).not.toContain('--from');
    });
  });
});
