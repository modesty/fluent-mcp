/**
 * Tests for `fluent_transform` against the SDK v4.13.6 `now-sdk transform`
 * builder (`sdk-cli/dist/command/transform`): its three modes, the yargs
 * `.check()`/`.conflicts()` rules mirrored up front, and the `force`/`format`
 * flags the CLI has declared since before 4.11.2 but the tool never exposed.
 */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { assertCalledTimes, assertNotCalled } from '../support/mockAssertions.js';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor } from '../../src/utils/types.js';

// Session replacement: no alias is held, so an instance pull must go through the
// lazy auth-discovery hook the command is constructed with.
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

const { TransformCommand } = await import('../../src/tools/commands/index.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';

type ProcessFn = CommandProcessor['process'];

/** Asserts every expected token appears in argv (the Jest arrayContaining intent). */
function assertContainsAll(actual: readonly string[], expected: readonly string[]): void {
  for (const token of expected) {
    assert.ok(actual.includes(token), `expected argv to contain ${JSON.stringify(token)}; received ${JSON.stringify(actual)}`);
  }
}

/** Rejection whose message contains `message` (the Jest `rejects.toThrow(string)` intent). */
async function assertRejectsContaining(promise: Promise<unknown>, message: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof Error, 'expected an Error rejection');
    assert.ok(error.message.includes(message), `expected "${error.message}" to include "${message}"`);
    return true;
  });
}

describe('TransformCommand (SDK v4.13.6 transform)', () => {
  let mockProcessor: { process: ReturnType<typeof mock.fn<ProcessFn>> };
  let ensureAuth: ReturnType<typeof mock.fn<() => Promise<void>>>;
  let command: InstanceType<typeof TransformCommand>;

  const argvOf = (call = 0): string[] => mockProcessor.process.mock.calls[call].arguments[1];

  beforeEach(() => {
    mockProcessor = {
      process: mock.fn<ProcessFn>(async () => ({ success: true, output: 'ok', exitCode: 0 })),
    };
    ensureAuth = mock.fn<() => Promise<void>>(async () => undefined);
    command = new TransformCommand(mockProcessor, ensureAuth);
  });

  describe('metadata', () => {
    it('exposes force and format alongside the existing arguments', () => {
      assert.deepStrictEqual(command.arguments.map((arg) => arg.name), [
        'workingDirectory', 'from', 'directory', 'auth', 'table', 'id', 'force', 'format', 'timeoutSeconds', 'debug',
      ]);
      const byName = Object.fromEntries(command.arguments.map((arg) => [arg.name, arg]));
      assert.equal(byName.force.type, 'boolean');
      assert.equal(byName.format.type, 'boolean');
    });

    it('describes table without id as a local filter, not an instance pull', () => {
      // The developing-apps guide says --table scopes an instance pull; the
      // orchestrator's resolveTableTransformFiles only ever reads local XML.
      assert.ok(command.description.includes('table without id only filters local XML'));
      assert.ok(command.description.includes('it does not download'));
      const table = command.arguments.find((arg) => arg.name === 'table');
      assert.ok(table?.description.includes('no download'));
    });

    it('states the from/auth and from/id exclusions where the caller reads them', () => {
      assert.ok(command.description.includes('cannot be combined with auth or id'));
      const from = command.arguments.find((arg) => arg.name === 'from');
      assert.ok(from?.description.includes('cannot be combined with auth or id'));
    });

    it('stays destructive and open-world', () => {
      assert.deepStrictEqual(command.annotations, { openWorldHint: true, destructiveHint: true });
    });
  });

  describe('modes', () => {
    it('full-application pull maps auth and runs lazy auth discovery', async () => {
      await command.execute({ workingDirectory: '/project' });
      assertCalledTimes(ensureAuth, 1);
      assert.equal(argvOf()[0], SDK_BIN);
      assert.equal(argvOf()[1], 'transform');
    });

    it('an explicit alias on an instance pull is forwarded without discovery', async () => {
      await command.execute({ workingDirectory: '/project', auth: 'dev' });
      assertNotCalled(ensureAuth);
      assertContainsAll(argvOf(), ['--auth', 'dev']);
    });

    it('a from transform is offline: no auth flag and no discovery', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata/update' });
      assertNotCalled(ensureAuth);
      assertContainsAll(argvOf(), ['--from', 'metadata/update']);
      assert.ok(!argvOf().includes('--auth'));
    });

    it('table with id pulls one record from the instance', async () => {
      await command.execute({ workingDirectory: '/project', auth: 'dev', table: 'sys_script', id: 'abc123' });
      assertContainsAll(argvOf(), ['--table', 'sys_script', '--id', 'abc123', '--auth', 'dev']);
    });

    it('table without from still maps auth, because only --from marks the CLI run offline', async () => {
      await command.execute({ workingDirectory: '/project', table: 'sys_script' });
      assertCalledTimes(ensureAuth, 1);
      assertContainsAll(argvOf(), ['--table', 'sys_script']);
    });

    it('table with from narrows a local transform without auth', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata', table: 'sys_script,sys_script_include' });
      assertNotCalled(ensureAuth);
      assertContainsAll(argvOf(), ['--from', 'metadata', '--table', 'sys_script,sys_script_include']);
      assert.ok(!argvOf().includes('--auth'));
    });
  });

  describe('force and format flags', () => {
    it('force: true emits --force', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata', table: 'sys_script', force: true });
      assert.ok(argvOf().includes('--force'));
    });

    it('force: false emits nothing (CLI default false)', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata', force: false });
      assert.ok(!argvOf().includes('--force'));
    });

    it('format: false emits the yargs negation --no-format', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata', format: false });
      assert.ok(argvOf().includes('--no-format'));
      assert.ok(!argvOf().includes('--format'));
    });

    it('format omitted leaves the CLI default (true) in place', async () => {
      await command.execute({ workingDirectory: '/project', from: 'metadata' });
      assert.equal(argvOf().some((token) => token.endsWith('format')), false);
    });
  });

  describe('CLI combination rules, rejected before spawning', () => {
    for (const [label, args, message] of [
      ['from + auth', { from: 'metadata', auth: 'dev' }, "Arguments 'from' and 'auth' cannot be combined"],
      ['id without table', { auth: 'dev', id: 'abc123' }, "Argument 'id' requires 'table'"],
      ['from + id', { from: 'metadata', table: 'sys_script', id: 'abc123' }, "Arguments 'from' and 'id' cannot be combined"],
      ['force without table', { from: 'metadata', force: true }, "Argument 'force' requires 'table'"],
    ] as const) {
      it(label, async () => {
        await assertRejectsContaining(command.execute({ workingDirectory: '/project', ...args }), message);
        assertNotCalled(ensureAuth);
        assertNotCalled(mockProcessor.process);
      });
    }

    it('treats an empty-string from as absent, matching the flag map', async () => {
      await command.execute({ workingDirectory: '/project', from: '', auth: 'dev' });
      assertContainsAll(argvOf(), ['--auth', 'dev']);
      assert.ok(!argvOf().includes('--from'));
    });
  });
});
