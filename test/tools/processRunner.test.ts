/**
 * Tests that NodeProcessRunner logs child-process detail at DEBUG (not INFO),
 * keeping the default info-level log clean. The logger is replaced with the
 * shared fixture (every level a mock.fn), so we assert against its level methods.
 *
 * Also covers non-interactive stdin (input written whole, then closed) and spawn failures (ENOENT).
 *
 * Native runner: the runner itself is real and spawns real child processes; only
 * config and logger are replaced, registered before the module is imported.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { configFixture, loggerFixture } from '../support/fixtures.js';

const config = configFixture();
mock.module('../../src/config.js', config.mockOptions);

const { logger: mockedLogger, mockOptions: loggerOptions } = loggerFixture();
mock.module('../../src/utils/logger.js', loggerOptions);

const { NodeProcessRunner } = await import('../../src/tools/processors/processRunner.js');
const { CLIExecutor } = await import('../../src/tools/processors/cliExecutor.js');

function joinCalls(fn: { mock: { calls: ReadonlyArray<{ arguments: unknown[] }> } }): string {
  return fn.mock.calls.map((c) => String(c.arguments[0])).join('\n');
}

function resetLoggerCalls(): void {
  for (const fn of Object.values(mockedLogger)) fn.mock.resetCalls();
}

describe('NodeProcessRunner logging level', () => {
  beforeEach(resetLoggerCalls);

  it('logs spawn, stdout, and exit at DEBUG — not INFO', async () => {
    const runner = new NodeProcessRunner();
    const result = await runner.run(
      process.execPath,
      ['-e', "process.stdout.write('hello-from-child')"]
    );

    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('hello-from-child'));

    const debugText = joinCalls(mockedLogger.debug);
    assert.ok(debugText.includes('Spawning child process'));
    assert.ok(debugText.includes('[STDOUT]'));
    assert.ok(debugText.includes('Process exited with code'));

    const infoText = joinCalls(mockedLogger.info);
    assert.ok(!infoText.includes('[STDOUT]'));
    assert.ok(!infoText.includes('Spawning child process'));
    assert.ok(!infoText.includes('Process exited'));
  });

  it('logs child stderr at DEBUG', async () => {
    const runner = new NodeProcessRunner();
    await runner.run(process.execPath, ['-e', "process.stderr.write('err-from-child')"]);

    const debugText = joinCalls(mockedLogger.debug);
    assert.ok(debugText.includes('[STDERR]'));

    const infoText = joinCalls(mockedLogger.info);
    assert.ok(!infoText.includes('[STDERR]'));
  });
});

describe('NodeProcessRunner shell-free execution (H1 injection defense)', () => {
  beforeEach(resetLoggerCalls);

  it('passes spaces, globs, metacharacters, and newlines through as inert literals', async () => {
    const runner = new NodeProcessRunner();
    // Spaces, `;`, `$()`, a newline, `|`, and `>` — all of which a shell would
    // interpret as syntax. Shell-free, they must survive verbatim as one argv[1].
    const payload = 'a b;*.ts?c$(whoami)\nrm|x>y';
    const result = await runner.run(
      process.execPath,
      ['-e', 'process.stdout.write(process.argv[1])', payload]
    );

    assert.equal(result.exitCode, 0);
    // No command substitution ran, no split on spaces/newlines, no redirection.
    assert.equal(result.stdout, payload);
  });
});

/**
 * A child that reads stdin to EOF the way `now-sdk auth --add --password-stdin`
 * does (sdk-cli `readPasswordFromStdin`): it prints no prompt first, and then
 * prints what it read as JSON.
 */
const READS_STDIN_TO_EOF = ['-e', [
  'const chunks = [];',
  "process.stdin.on('data', (d) => chunks.push(d));",
  "process.stdin.on('end', () => process.stdout.write('read=' + JSON.stringify(Buffer.concat(chunks).toString())));",
].join(' ')];

describe('NodeProcessRunner stdin', () => {
  beforeEach(resetLoggerCalls);

  it('writes the input whole and closes stdin, so a read to EOF completes without a prompt', { timeout: 10_000 }, async () => {
    // The former runner wrote only after a "? " prompt, so this child waited
    // for input until the timeout; it also split the input into non-empty lines.
    const runner = new NodeProcessRunner();
    const result = await runner.run(process.execPath, READS_STDIN_TO_EOF, undefined, 'p@ss\n\nword\n', 5_000);

    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(result.stdout, 'read="p@ss\\n\\nword\\n"');
  });

  it('writes nothing to a child that prints a "? " line when the call has no input', { timeout: 10_000 }, async () => {
    // The former runner answered any stdout ending in "? <text>" with the next
    // input line, so a diagnostic of that shape received a credential (W9
    // review). The child echoes anything it reads and otherwise waits until the
    // runner's timeout ends it; stdin stays open, as it always did without input.
    const runner = new NodeProcessRunner();
    const result = await runner.run(
      process.execPath,
      ['-e', "process.stdout.write('? Continue with the default instance? '); process.stdin.on('data', (d) => process.stdout.write('got:' + d));"],
      undefined,
      undefined,
      1_500
    );

    assert.equal(result.exitCode, 124);
    assert.ok(!result.stdout.includes('got:'), `stdin was written: ${result.stdout}`);
  });

  it('reports the exit of a child that ends without reading its input (EPIPE)', { timeout: 10_000 }, async () => {
    // 1 MB exceeds the pipe buffer, so the write is still pending when the child exits.
    const runner = new NodeProcessRunner();
    const result = await runner.run(process.execPath, ['-e', 'process.exit(3)'], undefined, 'x'.repeat(1_000_000));

    assert.equal(result.exitCode, 3);
  });
});

describe('NodeProcessRunner spawn failure', () => {
  const missing = '/nonexistent/fluent-mcp-test/no-such-command';

  it('rejects with ENOENT when the command does not exist', async () => {
    const runner = new NodeProcessRunner();
    await assert.rejects(runner.run(missing, ['--version']), { code: 'ENOENT' });
  });

  it('CLIExecutor turns the spawn failure into a failed CommandResult instead of throwing', async () => {
    const result = await new CLIExecutor(new NodeProcessRunner()).process(missing, ['--version']);

    assert.equal(result.success, false);
    assert.equal(result.exitCode, 1);
    assert.match(result.error?.message ?? '', /ENOENT/);
    assert.equal(result.output, result.error?.message);
  });
});
