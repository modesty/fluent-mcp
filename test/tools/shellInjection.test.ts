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
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor } from '../../src/utils/types.js';

// Session replacement: commands resolve their working directory from the
// initialized session, which this suite pins to a fixed path.
const session = {
  getWorkingDirectory: mock.fn((): string | undefined => '/mock/working/dir'),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(),
  setAuthValidationResult: mock.fn(),
};

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => session } },
});

const { DownloadCommand } = await import('../../src/tools/commands/downloadCommand.js');
const { TransformCommand } = await import('../../src/tools/commands/transformCommand.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessFn = CommandProcessor['process'];

describe('Shell-free arg handling for free-string paths (H1)', () => {
  let mockProcessor: { process: ReturnType<typeof mock.fn<ProcessFn>> };

  beforeEach(() => {
    mockProcessor = {
      process: mock.fn<ProcessFn>(async () => ({ success: true, output: 'ok', exitCode: 0 })),
    };
  });

  describe('correctness — spaces preserved as one token', () => {
    it('download passes a directory with spaces as a single argv entry', async () => {
      const command = new DownloadCommand(mockProcessor);
      const result = await command.execute({ directory: 'my app dir' });

      assert.equal(result.success, true);
      const argv = mockProcessor.process.mock.calls[0].arguments[1];
      assert.deepStrictEqual(argv, [
        SDK_BIN,
        'download',
        'my app dir',
      ]);
    });

    it('transform passes a from-path with spaces as a single argv entry', async () => {
      const command = new TransformCommand(mockProcessor);
      const result = await command.execute({ from: 'my file.xml' });

      assert.equal(result.success, true);
      const argv = mockProcessor.process.mock.calls[0].arguments[1];
      // Stricter than the original arrayContaining: the path follows --from as ONE token.
      assert.ok(argv.includes('--from'));
      assert.equal(argv[argv.indexOf('--from') + 1], 'my file.xml');
    });
  });

  describe('safety — metacharacters and control chars rejected', () => {
    it('rejects a download directory with a command separator', async () => {
      const command = new DownloadCommand(mockProcessor);
      await assert.rejects(command.execute({ directory: 'evil; rm -rf /' }), /Invalid characters/);
      assertNotCalled(mockProcessor.process);
    });

    it('rejects a transform from-path with command substitution', async () => {
      const command = new TransformCommand(mockProcessor);
      await assert.rejects(command.execute({ from: 'x$(whoami)' }), /Invalid characters/);
      assertNotCalled(mockProcessor.process);
    });

    it('rejects a transform from-path containing a newline (command separator)', async () => {
      const command = new TransformCommand(mockProcessor);
      await assert.rejects(command.execute({ from: 'a\nrm -rf /' }), /Invalid characters/);
      assertNotCalled(mockProcessor.process);
    });

    it('rejects a download directory containing a pipe', async () => {
      const command = new DownloadCommand(mockProcessor);
      await assert.rejects(command.execute({ directory: 'a | cat' }), /Invalid characters/);
      assertNotCalled(mockProcessor.process);
    });
  });
});
