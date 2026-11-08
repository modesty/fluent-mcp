/**
 * Tests that NodeProcessRunner logs child-process detail at DEBUG (not INFO),
 * keeping the default info-level log clean. The logger is replaced with the
 * shared fixture (every level a mock.fn), so we assert against its level methods.
 *
 * Also covers spawn failures (ENOENT).
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
