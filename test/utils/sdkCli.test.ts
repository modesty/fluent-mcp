/**
 * Tests for resolveSdkCli. Uses the real implementation (the global mock in
 * setup.js is bypassed via jest.requireActual) so we verify it locates the
 * bundled @servicenow/sdk CLI in this repo.
 */
import fs from 'node:fs';

const { resolveSdkCli, resetSdkCliCache } = jest.requireActual(
  '../../src/utils/sdkCli.js'
) as typeof import('../../src/utils/sdkCli.js');

describe('resolveSdkCli', () => {
  beforeEach(() => resetSdkCliCache());
  afterEach(() => resetSdkCliCache());

  it('resolves the bundled SDK CLI with the current Node executable', () => {
    const { command, baseArgs } = resolveSdkCli();

    expect(command).toBe(process.execPath);
    expect(baseArgs).toHaveLength(1);
    const binPath = baseArgs[0];
    expect(binPath.endsWith('bin/index.js')).toBe(true);
    expect(binPath).toContain('@servicenow/sdk');
    expect(fs.existsSync(binPath)).toBe(true);
  });

  it('never returns a package-runner invocation', () => {
    const { command, baseArgs } = resolveSdkCli();
    expect(command).not.toBe('now-sdk');
    expect(command).not.toBe('npx');
    expect(baseArgs).not.toContain('now-sdk');
    expect(baseArgs).not.toContain('@servicenow/sdk');
  });

  it('memoizes the resolution', () => {
    const first = resolveSdkCli();
    const second = resolveSdkCli();
    expect(second).toBe(first);
  });

  it('fails closed instead of falling back to npx when the bundled CLI is missing', () => {
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    try {
      expect(() => resolveSdkCli()).toThrow(
        /Unable to resolve the bundled @servicenow\/sdk CLI.*installation is incomplete/
      );
    } finally {
      existsSpy.mockRestore();
    }
  });
});
