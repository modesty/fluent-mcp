/**
 * Tests for the real stderr-only logger pipeline.
 */

const { Logger } = jest.requireActual('../../src/utils/logger.js') as typeof import('../../src/utils/logger.js');

describe('Logger stderr pipeline', () => {
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('writes a structured line to stderr', () => {
    const logger = new Logger();

    logger.info('hello world', { code: 42 });

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const line = String(stderrSpy.mock.calls[0][0]);
    expect(line).toContain('[INFO]: hello world');
    expect(line).toContain('"code":42');
  });

  it('honors the configured minimum level', () => {
    const logger = new Logger();

    logger.debug('hidden');
    logger.warn('visible');

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(String(stderrSpy.mock.calls[0][0])).toContain('[WARNING]: visible');
  });
});
