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
    const result = await runner.run(
      process.execPath,
      ['-e', "process.stdout.write('hello-from-child')"]
    );

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
    await runner.run(process.execPath, ['-e', "process.stderr.write('err-from-child')"]);

    const debugText = joinCalls(mockedLogger.debug);
    expect(debugText).toContain('[STDERR]');

    const infoText = joinCalls(mockedLogger.info);
    expect(infoText).not.toContain('[STDERR]');
  });
});

describe('NodeProcessRunner shell-free execution (H1 injection defense)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes spaces, globs, metacharacters, and newlines through as inert literals', async () => {
    const runner = new NodeProcessRunner();
    // Spaces, `;`, `$()`, a newline, `|`, and `>` — all of which a shell would
    // interpret as syntax. Shell-free, they must survive verbatim as one argv[1].
    const payload = 'a b;*.ts?c$(whoami)\nrm|x>y';
    const result = await runner.run(
      process.execPath,
      ['-e', 'process.stdout.write(process.argv[1])', payload]
    );

    expect(result.exitCode).toBe(0);
    // No command substitution ran, no split on spaces/newlines, no redirection.
    expect(result.stdout).toBe(payload);
  });

  it('does not execute an injected command via `$( )` substitution', async () => {
    const runner = new NodeProcessRunner();
    // If a shell interpreted this, `whoami` would run and its output would appear.
    const payload = '$(whoami)';
    const result = await runner.run(
      process.execPath,
      ['-e', 'process.stdout.write(process.argv[1])', payload]
    );

    expect(result.stdout).toBe('$(whoami)');
  });
});
