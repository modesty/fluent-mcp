/**
 * Tests that NodeProcessRunner logs child-process detail at DEBUG (not INFO),
 * keeping the default info-level log clean. The logger is globally mocked
 * (see test/setup.js), so we assert against the mocked level methods.
 */
import { NodeProcessRunner } from '../../src/tools/processors/processRunner.js';
import logger from '../../src/utils/logger.js';

const mockedLogger = logger as unknown as {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
};

function joinCalls(mock: jest.Mock): string {
  return mock.mock.calls.map((c) => String(c[0])).join('\n');
}

describe('NodeProcessRunner logging level', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs spawn, stdout, and exit at DEBUG — not INFO', async () => {
    const runner = new NodeProcessRunner();
    // `shell: true`, so pass a plain shell command (avoids quoting pitfalls).
    const result = await runner.run('echo', ['hello-from-child']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello-from-child');

    const debugText = joinCalls(mockedLogger.debug);
    expect(debugText).toContain('Spawning child process');
    expect(debugText).toContain('[STDOUT]');
    expect(debugText).toContain('Process exited with code');

    const infoText = joinCalls(mockedLogger.info);
    expect(infoText).not.toContain('[STDOUT]');
    expect(infoText).not.toContain('Spawning child process');
    expect(infoText).not.toContain('Process exited');
  });

  it('logs child stderr at DEBUG', async () => {
    const runner = new NodeProcessRunner();
    // Redirect echo's stdout to stderr via the shell.
    await runner.run('echo', ['err-from-child', '1>&2']);

    const debugText = joinCalls(mockedLogger.debug);
    expect(debugText).toContain('[STDERR]');

    const infoText = joinCalls(mockedLogger.info);
    expect(infoText).not.toContain('[STDERR]');
  });
});
