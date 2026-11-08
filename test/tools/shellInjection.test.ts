/**
 * H1: with the bundled CLI spawned shell-free, executeSdkCommand args are passed
 * as literal argv entries. This locks in two properties for the free-string
 * paths (download `directory`, transform `from`):
 *   - CORRECTNESS: paths containing spaces survive as a SINGLE argv token
 *     (previously broken by the shell splitting on whitespace);
 *   - SAFETY: shell metacharacters are inert. They reach the CLI as literal
 *     argv data, proven here through the real NodeProcessRunner (no shell runs,
 *     a `$(touch …)` sentinel is never created). Control characters (newline,
 *     CR, tab) are still rejected, by the input schema.
 */
import { after, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hasOption, optionValue } from '../support/argv.js';
import { assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture, tempProjectDir } from '../support/fixtures.js';
import type { CommandProcessor } from '../../src/utils/types.js';

const WORKING_DIR = tempProjectDir('working-dir');

// Session replacement: commands resolve their working directory from the
// initialized session, which this suite pins to a fixed path.
const session = {
  getWorkingDirectory: mock.fn((): string | undefined => WORKING_DIR),
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
const { NodeProcessRunner } = await import('../../src/tools/processors/processRunner.js');

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

    it('download rejects a positional directory that begins with "-"', async () => {
      const command = new DownloadCommand(mockProcessor);

      await assert.rejects(command.execute({ directory: '--incremental' }), /Argument 'directory' must not begin with "-"/);
      assertNotCalled(mockProcessor.process);
    });

    it('transform keeps a dash-leading from-path inside --from', async () => {
      const command = new TransformCommand(mockProcessor);
      const result = await command.execute({ from: '-metadata' });

      assert.equal(result.success, true);
      assert.equal(optionValue(mockProcessor.process.mock.calls[0].arguments[1], '--from'), '-metadata');
    });

    it('transform passes a from-path with spaces as a single argv entry', async () => {
      const command = new TransformCommand(mockProcessor);
      const result = await command.execute({ from: 'my file.xml' });

      assert.equal(result.success, true);
      const argv = mockProcessor.process.mock.calls[0].arguments[1];
      // Stricter than the original arrayContaining: the path follows --from as ONE token.
      assert.ok(hasOption(argv, '--from'));
      assert.equal(optionValue(argv, '--from'), 'my file.xml');
    });
  });

  describe('safety — metacharacters are literal argv data; control characters are rejected', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-shell-free-'));
    after(() => fs.rmSync(root, { recursive: true, force: true }));
    const sentinel = path.join(root, 'ran');
    const hostile = ['evil; rm -rf /', `x$(touch ${sentinel})`, `\`touch ${sentinel}\``, 'a | cat', 'a && b', '$HOME', '*', 'a>b<c', '{a,b}', '[x]', 'back\\slash'];

    it('passes each metacharacter value to the command as one argv entry', async () => {
      for (const directory of hostile) {
        mockProcessor.process.mock.resetCalls();
        const result = await new DownloadCommand(mockProcessor).execute({ directory });
        assert.equal(result.success, true, directory);
        assert.deepStrictEqual(mockProcessor.process.mock.calls[0].arguments[1], [SDK_BIN, 'download', directory]);

        mockProcessor.process.mock.resetCalls();
        await new TransformCommand(mockProcessor).execute({ from: directory });
        assert.equal(optionValue(mockProcessor.process.mock.calls[0].arguments[1], '--from'), directory);
      }
    });

    it('the real process runner spawns without a shell: the child receives the values verbatim and nothing runs', async () => {
      // The schema rejects control characters before any spawn; the runner itself
      // must still keep a newline from splitting or ending a command.
      const values = [...hostile, 'a b;*.ts?c$(whoami)\nrm|x>y'];
      const printArgv = 'process.stdout.write(JSON.stringify(process.argv.slice(1)))';
      const result = await new NodeProcessRunner().run(process.execPath, ['-e', printArgv, '--', ...values]);
      assert.equal(result.exitCode, 0, result.stderr);
      assert.deepStrictEqual(JSON.parse(result.stdout), values);
      assert.equal(fs.existsSync(sentinel), false);
    });

    for (const [label, value] of [['a newline', 'a\nrm -rf /'], ['a carriage return', 'a\rb'], ['a tab', 'a\tb'], ['a NUL', 'a\u0000b']]) {
      it(`rejects ${label} in a path (control characters are never valid)`, async () => {
        await assert.rejects(new TransformCommand(mockProcessor).execute({ from: value }), /Invalid characters in argument 'from': control characters are not allowed/);
        await assert.rejects(new DownloadCommand(mockProcessor).execute({ directory: value }), /Invalid characters in argument 'directory'/);
        assertNotCalled(mockProcessor.process);
      });
    }
  });
});
