/**
 * H1: with the bundled CLI spawned shell-free, executeSdkCommand args are passed
 * as literal argv entries. This locks in two properties for the free-string
 * paths (download `directory`, transform `from`):
 *   - CORRECTNESS: paths containing spaces survive as a SINGLE argv token
 *     (previously broken by the shell splitting on whitespace);
 *   - SAFETY: the defense-in-depth validation added to executeSdkCommand rejects
 *     unexpected shell metacharacters and control characters (newline/CR/tab)
 *     at the command boundary.
 */
import { DownloadCommand } from '../../src/tools/commands/downloadCommand.js';
import { TransformCommand } from '../../src/tools/commands/transformCommand.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());
jest.mock('../../src/utils/rootContext.js', () => require('../mocks/index.js').createRootContextMock());
jest.mock('../../src/utils/sessionManager.js', () => require('../mocks/index.js').createSessionManagerMock());

describe('Shell-free arg handling for free-string paths (H1)', () => {
  let mockProcessor: { process: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessor = {
      process: jest.fn().mockResolvedValue({ success: true, output: 'ok', exitCode: 0 }),
    };
  });

  describe('correctness — spaces preserved as one token', () => {
    it('download passes a directory with spaces as a single argv entry', async () => {
      const command = new DownloadCommand(mockProcessor as never);
      const result = await command.execute({ directory: 'my app dir' });

      expect(result.success).toBe(true);
      const argv = mockProcessor.process.mock.calls[0][1] as string[];
      expect(argv).toEqual([
        '/test/node_modules/@servicenow/sdk/bin/index.js',
        'download',
        'my app dir',
      ]);
    });

    it('transform passes a from-path with spaces as a single argv entry', async () => {
      const command = new TransformCommand(mockProcessor as never);
      const result = await command.execute({ from: 'my file.xml' });

      expect(result.success).toBe(true);
      const argv = mockProcessor.process.mock.calls[0][1] as string[];
      expect(argv).toEqual(expect.arrayContaining(['--from', 'my file.xml']));
    });
  });

  describe('safety — metacharacters and control chars rejected', () => {
    it('rejects a download directory with a command separator', async () => {
      const command = new DownloadCommand(mockProcessor as never);
      await expect(command.execute({ directory: 'evil; rm -rf /' })).rejects.toThrow(
        /Invalid characters/
      );
      expect(mockProcessor.process).not.toHaveBeenCalled();
    });

    it('rejects a transform from-path with command substitution', async () => {
      const command = new TransformCommand(mockProcessor as never);
      await expect(command.execute({ from: 'x$(whoami)' })).rejects.toThrow(/Invalid characters/);
      expect(mockProcessor.process).not.toHaveBeenCalled();
    });

    it('rejects a transform from-path containing a newline (command separator)', async () => {
      const command = new TransformCommand(mockProcessor as never);
      await expect(command.execute({ from: 'a\nrm -rf /' })).rejects.toThrow(/Invalid characters/);
      expect(mockProcessor.process).not.toHaveBeenCalled();
    });

    it('rejects a download directory containing a pipe', async () => {
      const command = new DownloadCommand(mockProcessor as never);
      await expect(command.execute({ directory: 'a | cat' })).rejects.toThrow(/Invalid characters/);
      expect(mockProcessor.process).not.toHaveBeenCalled();
    });
  });
});
