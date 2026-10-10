/**
 * Tests for the SDK v4.13.0 `download` / `transform` `--timeout` surface:
 * the shared `timeoutSeconds` argument, its validation, and the runner timeout
 * it extends so the runner never kills the child before the CLI can report.
 *
 * Native runner: config, logger, SDK CLI resolution and the session manager are
 * replaced before the commands are imported. The process runner is a mock.fn
 * processor handed to each command, so nothing is spawned here.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);

// Session manager stub: a fixed working directory and no auth
// alias (the cases here pass `auth` explicitly).
const sessionInstance = {
  getWorkingDirectory: mock.fn(() => '/mock/working/dir'),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn((): unknown => undefined),
  setAuthValidationResult: mock.fn(),
};
const SessionManager = {
  getInstance: mock.fn(() => sessionInstance),
  getWorkingDirectory: mock.fn(() => '/mock/working/dir'),
  setWorkingDirectory: mock.fn(),
};
mock.module('../../src/utils/sessionManager.js', { namedExports: { SessionManager } });

const { DownloadCommand, TransformCommand } = await import('../../src/tools/commands/index.js');
const { RESPONSE_TIMEOUT_ARGUMENT, runnerTimeoutForResponseTimeout } = await import(
  '../../src/tools/commands/responseTimeout.js'
);

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessCall = { arguments: unknown[] };

describe('timeoutSeconds (SDK v4.13.0 --timeout)', () => {
  let mockProcessor: { process: ReturnType<typeof mock.fn> };

  beforeEach(() => {
    mockProcessor = {
      process: mock.fn(async () => ({ success: true, output: 'ok', exitCode: 0 })),
    };
  });

  describe('shared argument', () => {
    it('is named timeoutSeconds so it cannot be confused with query_fluent_records millisecond timeout', () => {
      assert.equal(RESPONSE_TIMEOUT_ARGUMENT.name, 'timeoutSeconds');
      assert.equal(RESPONSE_TIMEOUT_ARGUMENT.type, 'number');
      assert.equal(RESPONSE_TIMEOUT_ARGUMENT.required, false);
    });

    it('describes seconds, the 3600 CLI default, and idle (not total) semantics', () => {
      // The 4.13.0 release note says the default is 300 seconds — that was
      // undici's previous bodyTimeout; longRunningConnector sets 3600.
      const { description } = RESPONSE_TIMEOUT_ARGUMENT;
      assert.ok(description.includes('Seconds'));
      assert.ok(description.includes('CLI default 3600'));
      assert.ok(description.includes('An idle timeout, not a total'));
      assert.ok(!description.includes('300 '));
    });
  });

  describe('runnerTimeoutForResponseTimeout', () => {
    it('keeps the base budget when no timeout is supplied', () => {
      assert.equal(runnerTimeoutForResponseTimeout(600_000, undefined), 600_000);
    });

    it('keeps the base budget when the CLI timeout plus headroom is smaller', () => {
      assert.equal(runnerTimeoutForResponseTimeout(600_000, 60), 600_000);
    });

    it('extends past the CLI timeout by a minute of headroom', () => {
      assert.equal(runnerTimeoutForResponseTimeout(600_000, 3600), 3_660_000);
    });
  });

  const commandCases = [
    ['DownloadCommand', (p: any) => new DownloadCommand(p), { directory: 'my-app' }, 'download'],
    ['TransformCommand', (p: any) => new TransformCommand(p), {}, 'transform'],
  ] as const;

  for (const [_name, create, baseArgs, subcommand] of commandCases) {
    describe(_name, () => {
      it('advertises timeoutSeconds', () => {
        const command = create(mockProcessor);
        assert.ok(command.arguments.map((arg) => arg.name).includes('timeoutSeconds'));
      });

      it('raises the default runner budget above the old 180 s cap', () => {
        assert.equal(create(mockProcessor).timeoutMs, 600_000);
      });

      it('maps timeoutSeconds to --timeout and extends the runner timeout', async () => {
        const command = create(mockProcessor);
        const result = await command.execute({ ...baseArgs, auth: 'dev', timeoutSeconds: 7200 });

        assert.equal(result.success, true);
        const [, argv, , , timeoutMs] = (mockProcessor.process.mock.calls[0] as ProcessCall).arguments as [
          unknown,
          string[],
          unknown,
          unknown,
          number,
        ];
        assert.equal(argv[0], SDK_BIN);
        assert.equal(argv[1], subcommand);
        const flagIndex = argv.indexOf('--timeout');
        assert.ok(flagIndex > -1);
        assert.equal(argv[flagIndex + 1], '7200');
        assert.equal(timeoutMs, 7_260_000);
      });

      it('uses the static budget when timeoutSeconds is omitted', async () => {
        const command = create(mockProcessor);
        await command.execute({ ...baseArgs, auth: 'dev' });

        const [, argv, , , timeoutMs] = (mockProcessor.process.mock.calls[0] as ProcessCall).arguments as [
          unknown,
          string[],
          unknown,
          unknown,
          number,
        ];
        assert.ok(!argv.includes('--timeout'));
        assert.equal(timeoutMs, 600_000);
      });

      for (const value of [0, -5, 1.5]) {
        it(`rejects a non-positive-integer timeoutSeconds (${value}) before spawning`, async () => {
          const command = create(mockProcessor);
          await assert.rejects(
            command.execute({ ...baseArgs, auth: 'dev', timeoutSeconds: value }),
            /Argument 'timeoutSeconds' must be a positive integer/
          );
          assert.equal(mockProcessor.process.mock.callCount(), 0);
        });
      }
    });
  }
});
