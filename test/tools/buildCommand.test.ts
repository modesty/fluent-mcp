/**
 * Tests for BuildCommand with the SDK v4.14.0 `--sourceMap` flag. The CLI flag
 * has no default (the now.config.json `sourceMap` value applies), so only an
 * explicit value is forwarded, and `false` must be the yargs negation to
 * override a project that enables it.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledWith } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor } from '../../src/utils/types.js';

const session = {
  getWorkingDirectory: mock.fn((): string | undefined => '/mock/working/dir'),
  setWorkingDirectory: mock.fn(),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(),
  setAuthValidationResult: mock.fn(),
};

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);
mock.module('../../src/utils/sessionManager.js', {
  namedExports: { SessionManager: { getInstance: () => session } },
});

const { BuildCommand } = await import('../../src/tools/commands/buildCommand.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessFn = CommandProcessor['process'];

describe('BuildCommand', () => {
  let mockProcessor: { process: ReturnType<typeof mock.fn<ProcessFn>> };

  beforeEach(() => {
    mockProcessor = {
      process: mock.fn<ProcessFn>(async () => ({ success: true, output: 'Build completed successfully', exitCode: 0 })),
    };
  });

  it('declares an optional boolean sourceMap argument', () => {
    const command = new BuildCommand(mockProcessor);
    const sourceMap = command.arguments.find((arg) => arg.name === 'sourceMap');
    assert.equal(sourceMap?.type, 'boolean');
    assert.equal(sourceMap?.required, false);
  });

  for (const [label, args, argv] of [
    ['omits the flag when sourceMap is not set (project setting applies)', {}, [SDK_BIN, 'build']],
    ['emits --sourceMap when true', { sourceMap: true }, [SDK_BIN, 'build', '--sourceMap']],
    ['emits the --no-sourceMap negation when false', { sourceMap: false }, [SDK_BIN, 'build', '--no-sourceMap']],
  ] as const) {
    it(label, async () => {
      const command = new BuildCommand(mockProcessor);
      const result = await command.execute({ ...args });

      assert.equal(result.success, true);
      assertCalledWith(mockProcessor.process, process.execPath, [...argv], '/mock/working/dir', undefined, 180_000, undefined);
    });
  }
});
