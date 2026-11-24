/**
 * Tests for the `download` / `transform` instance waits: `--timeout` (SDK
 * v4.13.0) and `--connect-timeout` (SDK v4.14.3). Covers the shared
 * `timeoutSeconds` / `connectTimeoutSeconds` arguments, their validation, and
 * the runner timeout they extend so the runner never kills the child before
 * the CLI can report.
 *
 * Native runner: config, logger, SDK CLI resolution and the session manager are
 * replaced before the commands are imported. The process runner is a mock.fn
 * processor handed to each command, so nothing is spawned here.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { hasOption, optionValue } from '../support/argv.js';
import { configFixture, loggerFixture, sdkCliFixture, tempProjectDir } from '../support/fixtures.js';

const WORKING_DIR = tempProjectDir('working-dir');

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);

// Session manager stub: a fixed working directory and no auth
// alias (the cases here pass `auth` explicitly).
const sessionInstance = {
  getWorkingDirectory: mock.fn(() => WORKING_DIR),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn((): unknown => undefined),
  setAuthValidationResult: mock.fn(),
};
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => sessionInstance } },
});

const { DownloadCommand, TransformCommand } = await import('../../src/tools/commands/index.js');
const { CONNECT_TIMEOUT_ARGUMENT, RESPONSE_TIMEOUT_ARGUMENT, runnerTimeoutForResponseTimeout } = await import(
  '../../src/tools/commands/responseTimeout.js'
);

type ProcessCall = { arguments: unknown[] };

describe('instance waits (SDK v4.13.0 --timeout, v4.14.3 --connect-timeout)', () => {
  let mockProcessor: { process: ReturnType<typeof mock.fn> };

  beforeEach(() => {
    mockProcessor = {
      process: mock.fn(async () => ({ success: true, output: 'ok', exitCode: 0 })),
    };
  });

  describe('shared argument', () => {
    it('describes seconds, the 3600 CLI default, and idle (not total) semantics', () => {
      // The 4.13.0 release note says the default is 300 seconds — that was
      // undici's previous bodyTimeout; longRunningConnector sets 3600.
      const { description } = RESPONSE_TIMEOUT_ARGUMENT;
      assert.ok(description.includes('Seconds'));
      assert.ok(description.includes('CLI default 3600'));
      assert.ok(description.includes('An idle timeout, not a total'));
      assert.ok(!description.includes('300 '));
    });

    // Since SDK v4.14.3 the long-running dispatcher serves every connector
    // request, so the description must not scope it to the full-app download.
    it('does not limit the idle timeout to the full-application download', () => {
      assert.ok(!RESPONSE_TIMEOUT_ARGUMENT.description.includes('full-application download'));
    });
  });

  describe('connectTimeoutSeconds argument', () => {
    it('states the SDK version, the 10 second CLI default, and where the proxy is configured', () => {
      const { description } = CONNECT_TIMEOUT_ARGUMENT;
      assert.ok(description.includes('SDK v4.14.3+'));
      assert.ok(description.includes('CLI default 10'));
      assert.ok(description.includes('NODE_USE_ENV_PROXY=1'));
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

    it('extends past a connect timeout supplied alone', () => {
      assert.equal(runnerTimeoutForResponseTimeout(600_000, undefined, 900), 960_000);
    });

    it('sums both waits, since one request can spend the connect and then the idle gap', () => {
      assert.equal(runnerTimeoutForResponseTimeout(600_000, 3600, 120), 3_780_000);
    });
  });

  const commandCases = [
    ['DownloadCommand', (p: any) => new DownloadCommand(p), { directory: 'my-app' }, 'download'],
    ['TransformCommand', (p: any) => new TransformCommand(p), {}, 'transform'],
  ] as const;

  for (const [_name, create, baseArgs, subcommand] of commandCases) {
    describe(_name, () => {
      it('targets a CLI that declares --connect-timeout', () => {
        const cli = path.resolve('node_modules/@servicenow/sdk/bin/index.js');
        const help = execFileSync(process.execPath, [cli, subcommand, '--help'], { encoding: 'utf8' });
        assert.match(help, /--connect-timeout\b/);
      });

      it('maps connectTimeoutSeconds to --connect-timeout and extends the runner timeout', async () => {
        const command = create(mockProcessor);
        const result = await command.execute({ ...baseArgs, auth: 'dev', timeoutSeconds: 7200, connectTimeoutSeconds: 120 });

        assert.equal(result.success, true);
        const [, argv, , timeoutMs] = (mockProcessor.process.mock.calls[0] as ProcessCall).arguments as [
          unknown,
          string[],
          unknown,
          number,
        ];
        assert.equal(optionValue(argv, '--connect-timeout'), '120');
        assert.equal(optionValue(argv, '--timeout'), '7200');
        assert.equal(timeoutMs, 7_380_000);
      });

      for (const value of [0, -5, 1.5]) {
        it(`rejects a non-positive-integer connectTimeoutSeconds (${value}) before spawning`, async () => {
          const command = create(mockProcessor);
          await assert.rejects(
            command.execute({ ...baseArgs, auth: 'dev', connectTimeoutSeconds: value }),
            /Argument 'connectTimeoutSeconds' must be a positive integer/
          );
          assert.equal(mockProcessor.process.mock.callCount(), 0);
        });
      }

      it('uses the static budget when timeoutSeconds is omitted', async () => {
        const command = create(mockProcessor);
        await command.execute({ ...baseArgs, auth: 'dev' });

        const [, argv, , timeoutMs] = (mockProcessor.process.mock.calls[0] as ProcessCall).arguments as [
          unknown,
          string[],
          unknown,
          number,
        ];
        assert.ok(!hasOption(argv, '--timeout'));
        assert.ok(!hasOption(argv, '--connect-timeout'));
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
