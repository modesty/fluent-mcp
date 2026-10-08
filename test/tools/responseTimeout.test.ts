/**
 * Tests for the SDK v4.13.0 `download` / `transform` `--timeout` surface:
 * the shared `timeoutSeconds` argument, its validation, and the runner timeout
 * it extends so the runner never kills the child before the CLI can report.
 */
import { DownloadCommand, TransformCommand } from '../../src/tools/commands/index.js';
import {
  RESPONSE_TIMEOUT_ARGUMENT,
  runnerTimeoutForResponseTimeout,
} from '../../src/tools/commands/responseTimeout.js';

jest.mock('../../src/utils/logger.js', () => require('../mocks/index.js').createLoggerMock());
jest.mock('../../src/config.js', () => require('../mocks/index.js').createConfigMock());
jest.mock('../../src/utils/sessionManager.js', () => require('../mocks/index.js').createSessionManagerMock());

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

describe('timeoutSeconds (SDK v4.13.0 --timeout)', () => {
  let mockProcessor: { process: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessor = {
      process: jest.fn().mockResolvedValue({ success: true, output: 'ok', exitCode: 0 }),
    };
  });

  describe('shared argument', () => {
    it('is named timeoutSeconds so it cannot be confused with query_fluent_records millisecond timeout', () => {
      expect(RESPONSE_TIMEOUT_ARGUMENT.name).toBe('timeoutSeconds');
      expect(RESPONSE_TIMEOUT_ARGUMENT.type).toBe('number');
      expect(RESPONSE_TIMEOUT_ARGUMENT.required).toBe(false);
    });

    it('describes seconds, the 3600 CLI default, and idle (not total) semantics', () => {
      // The 4.13.0 release note says the default is 300 seconds — that was
      // undici's previous bodyTimeout; longRunningConnector sets 3600.
      expect(RESPONSE_TIMEOUT_ARGUMENT.description).toContain('Seconds');
      expect(RESPONSE_TIMEOUT_ARGUMENT.description).toContain('CLI default 3600');
      expect(RESPONSE_TIMEOUT_ARGUMENT.description).toContain('An idle timeout, not a total');
      expect(RESPONSE_TIMEOUT_ARGUMENT.description).not.toContain('300 ');
    });
  });

  describe('runnerTimeoutForResponseTimeout', () => {
    it('keeps the base budget when no timeout is supplied', () => {
      expect(runnerTimeoutForResponseTimeout(600_000, undefined)).toBe(600_000);
    });

    it('keeps the base budget when the CLI timeout plus headroom is smaller', () => {
      expect(runnerTimeoutForResponseTimeout(600_000, 60)).toBe(600_000);
    });

    it('extends past the CLI timeout by a minute of headroom', () => {
      expect(runnerTimeoutForResponseTimeout(600_000, 3600)).toBe(3_660_000);
    });
  });

  describe.each([
    ['DownloadCommand', (p: any) => new DownloadCommand(p), { directory: 'my-app' }, 'download'],
    ['TransformCommand', (p: any) => new TransformCommand(p), {}, 'transform'],
  ] as const)('%s', (_name, create, baseArgs, subcommand) => {
    it('advertises timeoutSeconds', () => {
      const command = create(mockProcessor);
      expect(command.arguments.map((arg) => arg.name)).toContain('timeoutSeconds');
    });

    it('raises the default runner budget above the old 180 s cap', () => {
      expect(create(mockProcessor).timeoutMs).toBe(600_000);
    });

    it('maps timeoutSeconds to --timeout and extends the runner timeout', async () => {
      const command = create(mockProcessor);
      const result = await command.execute({ ...baseArgs, auth: 'dev', timeoutSeconds: 7200 });

      expect(result.success).toBe(true);
      const [, argv, , , timeoutMs] = mockProcessor.process.mock.calls[0];
      expect(argv[0]).toBe(SDK_BIN);
      expect(argv[1]).toBe(subcommand);
      const flagIndex = argv.indexOf('--timeout');
      expect(flagIndex).toBeGreaterThan(-1);
      expect(argv[flagIndex + 1]).toBe('7200');
      expect(timeoutMs).toBe(7_260_000);
    });

    it('uses the static budget when timeoutSeconds is omitted', async () => {
      const command = create(mockProcessor);
      await command.execute({ ...baseArgs, auth: 'dev' });

      const [, argv, , , timeoutMs] = mockProcessor.process.mock.calls[0];
      expect(argv).not.toContain('--timeout');
      expect(timeoutMs).toBe(600_000);
    });

    it.each([0, -5, 1.5])('rejects a non-positive-integer timeoutSeconds (%p) before spawning', async (value) => {
      const command = create(mockProcessor);
      await expect(command.execute({ ...baseArgs, auth: 'dev', timeoutSeconds: value })).rejects.toThrow(
        "Argument 'timeoutSeconds' must be a positive integer"
      );
      expect(mockProcessor.process).not.toHaveBeenCalled();
    });
  });
});
