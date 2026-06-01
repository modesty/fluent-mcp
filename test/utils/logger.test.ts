/**
 * Tests for the real Logger pipeline (the global logger mock is bypassed here
 * via jest.requireActual). Covers notification-only-post-connect routing and
 * MCP-spec-compliant notification payloads.
 */

// Pull in the actual implementation, bypassing the global logger mock in setup.js
const { Logger, LogLevel } = jest.requireActual('../../src/utils/logger.js') as typeof import('../../src/utils/logger.js');

type NotificationCall = { method: string; params: { level: string; logger: string; data: unknown } };

function makeFakeServer() {
  const notification = jest.fn();
  return {
    server: { notification },
    _notification: notification,
  } as unknown as { server: { notification: jest.Mock } } & { _notification: jest.Mock };
}

describe('Logger pipeline', () => {
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    delete process.env.FLUENT_MCP_LOG_TO_STDERR;
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('post-connect routing (notification-only)', () => {
    it('emits an MCP notification and does NOT write to stderr', () => {
      const logger = new Logger();
      const fake = makeFakeServer();
      logger.setMcpServer(fake as any);

      logger.info('hello world');

      expect(fake.server.notification).toHaveBeenCalledTimes(1);
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('sends a spec-shaped payload with no top-level message (plain string data)', () => {
      const logger = new Logger();
      const fake = makeFakeServer();
      logger.setMcpServer(fake as any);

      logger.info('plain message');

      const call = fake.server.notification.mock.calls[0][0] as NotificationCall;
      expect(call.method).toBe('notifications/message');
      expect(call.params.level).toBe(LogLevel.INFO);
      expect(call.params.logger).toBe('fluent-mcp');
      expect(call.params.data).toBe('plain message');
      expect((call.params as Record<string, unknown>).message).toBeUndefined();
    });

    it('folds context into data with message when context is present', () => {
      const logger = new Logger();
      const fake = makeFakeServer();
      logger.setMcpServer(fake as any);

      logger.warn('something', { code: 42 });

      const call = fake.server.notification.mock.calls[0][0] as NotificationCall;
      expect(call.params.level).toBe(LogLevel.WARNING);
      expect(call.params.data).toEqual({ message: 'something', code: 42 });
      expect((call.params as Record<string, unknown>).message).toBeUndefined();
    });

    it('falls back to stderr when the notification send throws', () => {
      const logger = new Logger();
      const fake = makeFakeServer();
      fake.server.notification.mockImplementation(() => {
        throw new Error('transport closed');
      });
      logger.setMcpServer(fake as any);

      logger.info('will fall back');

      // One stderr write for the failure notice + one for the mirrored entry
      expect(stderrSpy).toHaveBeenCalled();
    });
  });

  describe('pre-connect routing (bootstrap)', () => {
    it('writes to stderr when no MCP server is set', () => {
      const logger = new Logger();
      logger.info('bootstrap line');
      expect(stderrSpy).toHaveBeenCalledTimes(1);
      expect(stderrSpy.mock.calls[0][0]).toContain('bootstrap line');
    });
  });

  describe('FLUENT_MCP_LOG_TO_STDERR opt-in', () => {
    it('mirrors to stderr even after connect when enabled', () => {
      process.env.FLUENT_MCP_LOG_TO_STDERR = 'true';
      const logger = new Logger(); // reads the flag in the constructor
      const fake = makeFakeServer();
      logger.setMcpServer(fake as any);

      logger.info('mirrored');

      expect(fake.server.notification).toHaveBeenCalledTimes(1);
      expect(stderrSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendNotification (custom logger name)', () => {
    it('uses spec-shaped data and the provided logger name without mirroring by default', () => {
      const logger = new Logger();
      const fake = makeFakeServer();
      logger.setMcpServer(fake as any);

      logger.sendNotification(LogLevel.NOTICE, 'auth needed', { host: 'dev.example.com' }, 'authentication');

      const call = fake.server.notification.mock.calls[0][0] as NotificationCall;
      expect(call.params.logger).toBe('authentication');
      expect(call.params.data).toEqual({ message: 'auth needed', host: 'dev.example.com' });
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });
});
