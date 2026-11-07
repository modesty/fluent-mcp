/**
 * Unit tests for InitCommand
 *
 * Native runner:
 * - SessionManager is replaced by a module mock registered before InitCommand is
 *   imported, so setWorkingDirectory calls can be asserted on a shared handle.
 * - The logger and SDK CLI resolution use the shared fixtures; resolveSdkCli()
 *   yields process.execPath plus the fixed SDK entry point the argv assertions
 *   expect.
 * - The filesystem is real: every destination and conversion source is a path
 *   in a temp tree, so the destination contract (absolute, canonical, non-root,
 *   empty or new under an existing parent) is exercised as it runs in production.
 */
import { after, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { hasOption } from '../support/argv.js';
import { inspect } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { CommandResult } from '../../src/utils/types.js';
import { assertCalledTimes, assertCalledWith, assertNotCalled } from '../support/mockAssertions.js';
import { loggerFixture, sdkCliFixture } from '../support/fixtures.js';

// SessionManager mock: getInstance() always returns the same instance, so the
// assertions read setWorkingDirectory straight from it.
const sessionInstance = {
  getWorkingDirectory: mock.fn(() => '/previous/project'),
  setWorkingDirectory: mock.fn((_directory: string): void => undefined),
  getAuthAlias: mock.fn((): string | undefined => undefined),
  setAuthAlias: mock.fn(),
  getAuthValidationResult: mock.fn(() => undefined),
  setAuthValidationResult: mock.fn(),
};
const SessionManager = {
  getInstance: mock.fn(() => sessionInstance),
};
mock.module('../../src/utils/sessionManager.js', { namedExports: { SessionManager } });

mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);

const { InitCommand } = await import('../../src/tools/commands/initCommand.js');
const { VALID_TEMPLATES } = await import('../../src/tools/commands/init/index.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';
const SYS_ID = 'a1b2c3d4e5f6789012345678901234ab';
const CREATION = {
  appName: 'Test App',
  packageName: 'test-app',
  scopeName: 'x_test_scope',
  template: 'javascript.react',
};

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-init-command-')));
after(() => fs.rmSync(root, { recursive: true, force: true }));

let count = 0;
/** A path under the temp tree that does not exist yet. */
const fresh = (name: string): string => path.join(root, `${name}-${++count}`);
/** An existing directory holding the given files. */
function directoryWith(name: string, files: Record<string, string> = {}): string {
  const dir = fresh(name);
  fs.mkdirSync(dir);
  for (const [file, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, file), content);
  return dir;
}
/** An existing Fluent project: a populated directory, and no conversion source. */
const fluentProject = (name: string): string =>
  directoryWith(name, { 'now.config.json': JSON.stringify({ scope: 'x_existing_scope', name: 'existing-package' }) });
/** A legacy scoped application directory, as `now-sdk init --from <dir>` converts it. */
function legacyApp(name: string, subdir = ''): string {
  const dir = directoryWith(name);
  fs.mkdirSync(path.join(dir, subdir), { recursive: true });
  fs.writeFileSync(path.join(dir, subdir, `sys_app_${SYS_ID}.xml`), '<record_update/>');
  return dir;
}

describe('InitCommand', () => {
  let initCommand: InstanceType<typeof InitCommand>;
  let processMock: ReturnType<typeof createProcessMock>;
  let mockExecutor: { process: typeof processMock };
  let validDir: string;

  /** A command processor whose process() succeeds with a canned init result. */
  function createProcessMock() {
    return mock.fn(
      async (_command: string, _args: string[], _workingDir?: string): Promise<CommandResult> => ({
        success: true,
        output: 'Mock init command executed successfully',
        exitCode: 0,
      })
    );
  }

  /**
   * Asserts that some process() call ran process.execPath in `workingDirectory`
   * with exactly three arguments, the middle one (the SDK argv) accepted by `accepts`.
   */
  function assertProcessCalledWithSdkArgs(
    accepts: (sdkArgs: string[]) => boolean,
    workingDirectory: string,
    expectation: string
  ): void {
    const calls = processMock.mock.calls.map((call) => call.arguments as unknown[]);
    assert.ok(
      calls.some(
        (args) =>
          args.length === 3 &&
          args[0] === process.execPath &&
          Array.isArray(args[1]) &&
          accepts(args[1] as string[]) &&
          args[2] === workingDirectory
      ),
      `expected a process() call with ${expectation}; received ${inspect(calls)}`
    );
  }

  /** The command failed with `pattern`, reached no processor, and left the session alone. */
  function assertRefused(result: CommandResult, pattern: RegExp | string): void {
    assert.equal(result.success, false);
    if (typeof pattern === 'string') assert.equal(result.error?.message, pattern);
    else assert.match(result.error?.message ?? '', pattern);
    assertNotCalled(mockExecutor.process);
    assertNotCalled(sessionInstance.setWorkingDirectory);
  }

  /** Every expected value is present, in any order. */
  const containsAll = (expected: string[]) => (sdkArgs: string[]) =>
    expected.every((value) => sdkArgs.includes(value));

  beforeEach(() => {
    SessionManager.getInstance.mock.resetCalls();
    for (const fn of Object.values(sessionInstance)) fn.mock.resetCalls();
    // An alias one test sets must not reach the next.
    sessionInstance.getAuthAlias.mock.mockImplementation(() => undefined);

    validDir = directoryWith('valid');
    processMock = createProcessMock();
    mockExecutor = { process: processMock };
    initCommand = new InitCommand(mockExecutor);
  });

  it('should have correct properties', () => {
    assert.equal(initCommand.name, 'init_fluent_app');
    assert.ok(initCommand.description.includes('Initialize a new Fluent'));
    assert.ok(initCommand.description.includes('convert'));
    assert.ok(initCommand.arguments.length > 0);

    const intentArg = initCommand.arguments.find((arg) => arg.name === 'intent');
    assert.equal(intentArg?.required, false);
    assert.ok(intentArg?.description.includes('conversion'));
    assert.ok(intentArg?.description.includes('creation'));

    const workingDirArg = initCommand.arguments.find((arg) => arg.name === 'workingDirectory');
    assert.equal(workingDirArg?.required, true);

    const templateArg = initCommand.arguments.find((arg) => arg.name === 'template');
    assert.equal(templateArg?.required, false); // Only required for creation intent, not globally
    assert.ok(templateArg?.description.includes('For creation only'));

    const appNameArg = initCommand.arguments.find((arg) => arg.name === 'appName');
    assert.equal(appNameArg?.required, false);
    assert.ok(appNameArg?.description.includes('For creation'));

    const scopeNameArg = initCommand.arguments.find((arg) => arg.name === 'scopeName');
    assert.equal(scopeNameArg?.required, false);
    assert.ok(scopeNameArg?.description.includes('x_'));

    const fromArg = initCommand.arguments.find((arg) => arg.name === 'from');
    assert.equal(fromArg?.required, false);
    assert.ok(fromArg?.description.includes('For conversion'));
  });

  // MCP 2026-07-28 (SEP-2322) removed server-initiated requests, so the tool no
  // longer asks the client for missing values. Every argument must arrive with
  // the tools/call, and an incomplete bag must fail with an actionable message
  // rather than hang on a round trip that is no longer legal.
  it('should fail with an actionable error when no intent can be determined', async () => {
    // workingDirectory is required by the schema (as on tools/call); with it,
    // the intent resolver is what fails.
    const result = await initCommand.execute({ workingDirectory: validDir });

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Cannot determine intent for init_fluent_app'));
    // Names both modes and their required arguments
    assert.ok(result.error?.message.includes("intent to 'creation'"));
    assert.ok(result.error?.message.includes("intent to 'conversion'"));
    assert.ok(result.error?.message.includes('appName'));
    assert.ok(result.error?.message.includes('from'));
    // Never reaches the SDK
    assertNotCalled(mockExecutor.process);
  });

  it('should fail with an actionable error when conversion is missing from', async () => {
    const result = await initCommand.execute({ intent: 'conversion', workingDirectory: validDir });

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Required parameters for conversion are missing: from'));
    assertNotCalled(mockExecutor.process);
  });

  it('should treat null and blank arguments as absent when reporting missing input', async () => {
    // MCP clients commonly serialize an omitted optional value as null.
    const result = await initCommand.execute({
      intent: 'creation',
      appName: 'Test App',
      packageName: null,
      scopeName: '   ',
      workingDirectory: validDir,
      template: 'javascript.react',
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('Required parameters for creation are missing'));
    assert.ok(result.error?.message.includes('packageName'));
    assert.ok(result.error?.message.includes('scopeName'));
    assert.ok(!result.error?.message.includes('appName'));
  });

  it('should list the valid templates when creation input is incomplete', async () => {
    const result = await initCommand.execute({ intent: 'creation', appName: 'Test App', workingDirectory: validDir });

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes('typescript.vue'));
  });

  it('should fail when working directory not provided', async () => {
    const result = await initCommand.execute({ ...CREATION });

    assert.equal(result.success, false);
    // The input schema requires workingDirectory, on tools/call and here alike.
    assert.ok(result.error?.message.includes("Missing required argument 'workingDirectory'"));
  });

  describe('destination', () => {
    it('creates a new directory under an existing parent and saves it to the session', async () => {
      const destination = fresh('new');

      const result = await initCommand.execute({ ...CREATION, workingDirectory: destination });

      assert.equal(result.success, true, result.error?.message);
      assert.ok(fs.statSync(destination).isDirectory());
      assertCalledWith(sessionInstance.setWorkingDirectory, destination);
      assertProcessCalledWithSdkArgs(containsAll(['--appName=Test App']), destination, 'the new directory');
    });

    it('uses an existing empty directory without changing it', async () => {
      const result = await initCommand.execute({ ...CREATION, workingDirectory: validDir });

      assert.equal(result.success, true, result.error?.message);
      assert.deepEqual(fs.readdirSync(validDir), []);
      assertCalledWith(sessionInstance.setWorkingDirectory, validDir);
      assert.ok(result.output.includes(`This directory (${validDir}) has been saved`));
    });

    it('hands the processor and the session the canonical path', async (t) => {
      const link = fresh('link');
      try {
        fs.symlinkSync(validDir, link, 'dir');
      } catch {
        t.skip('symlinks need privileges here');
        return;
      }

      await initCommand.execute({ ...CREATION, workingDirectory: `${link}${path.sep}` });

      assertCalledWith(sessionInstance.setWorkingDirectory, validDir);
      assertProcessCalledWithSdkArgs(() => true, validDir, 'the resolved directory');
    });

    it('rejects the filesystem root with the actionable message', async () => {
      const rootDir = path.parse(root).root;
      const result = await initCommand.execute({ ...CREATION, workingDirectory: rootDir });

      assertRefused(result,
        `workingDirectory must identify a dedicated project directory, not "${rootDir}". ` +
        'Supply an empty absolute directory or a new absolute directory path to create.');
    });

    it('rejects a symlink to the filesystem root', async (t) => {
      const link = fresh('root-link');
      try {
        fs.symlinkSync(path.parse(root).root, link, 'dir');
      } catch {
        t.skip('symlinks need privileges here');
        return;
      }

      const result = await initCommand.execute({ ...CREATION, workingDirectory: link });

      assertRefused(result, /must identify a dedicated project directory, not ".*" \(it resolves to/);
    });

    for (const value of ['my-app', '~/my-app', 'apps/my-app']) {
      it(`rejects ${JSON.stringify(value)} rather than resolving it against the server`, async () => {
        const result = await initCommand.execute({ ...CREATION, workingDirectory: value });

        assertRefused(result, new RegExp(`workingDirectory must be an absolute path, not "${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
      });
    }

    for (const [label, files] of [
      ['a package.json', { 'package.json': '{}' }],
      ['any file at all', { 'notes.txt': '' }],
    ] as const) {
      it(`rejects a directory holding ${label}`, async () => {
        const dir = directoryWith('populated', files);

        const result = await initCommand.execute({ ...CREATION, workingDirectory: dir });

        assertRefused(result, /workingDirectory is not empty/);
      });
    }

    it('rejects an existing Fluent project, pointing at the project tools instead', async () => {
      const dir = fluentProject('existing-app');

      const result = await initCommand.execute({ ...CREATION, workingDirectory: dir });

      assertRefused(result, /workingDirectory is not empty: .*already holds a Fluent project/);
    });

    it('rejects a new directory whose parent is missing, and creates nothing', async () => {
      const parent = fresh('missing-parent');

      const result = await initCommand.execute({ ...CREATION, workingDirectory: path.join(parent, 'app') });

      assertRefused(result, /The parent directory of workingDirectory does not exist/);
      assert.equal(fs.existsSync(parent), false);
    });

    it('checks every other argument before creating the destination', async () => {
      const destination = fresh('not-created');

      const result = await initCommand.execute({ ...CREATION, scopeName: 'invalid_scope', workingDirectory: destination });

      assertRefused(result, /scopeName must start with "x_" prefix/);
      assert.equal(fs.existsSync(destination), false);
    });

    it('keeps the previous session directory when the command fails', async () => {
      processMock.mock.mockImplementation(async () => ({
        success: false,
        output: '',
        exitCode: 1,
        error: new Error('init failed'),
      }));

      const result = await initCommand.execute({ ...CREATION, workingDirectory: validDir });

      assert.equal(result.success, false);
      assertCalledTimes(mockExecutor.process, 1);
      assertNotCalled(sessionInstance.setWorkingDirectory);
    });

    it('checks the destination after auth, so a directory populated meanwhile is refused', async () => {
      // Lazy auth is the one await before the destination is used. A file that
      // appears while it runs must still be seen.
      const ensureAuthValidated = mock.fn(async () => {
        fs.writeFileSync(path.join(validDir, 'notes.txt'), '');
      });
      mockExecutor = { process: processMock };

      const result = await new InitCommand(mockExecutor, ensureAuthValidated).execute({ from: SYS_ID, workingDirectory: validDir });

      assertCalledTimes(ensureAuthValidated, 1);
      assertRefused(result, /workingDirectory is not empty: .*\(contains notes\.txt\)/);
    });

    describe('on a tool-side failure', () => {
      const failing = { success: false, output: '', exitCode: 1, error: new Error('init failed') };

      it('removes the directory this call created, and keeps the original error', async () => {
        processMock.mock.mockImplementation(async () => failing);
        const destination = fresh('rolled-back');

        const result = await initCommand.execute({ ...CREATION, workingDirectory: destination });

        assert.equal(result.error?.message, 'init failed');
        assert.equal(fs.existsSync(destination), false);
      });

      it('removes it when the processor throws, and reports that error', async () => {
        processMock.mock.mockImplementation(async () => {
          throw new Error('processor exploded');
        });
        const destination = fresh('thrown');

        const result = await initCommand.execute({ ...CREATION, workingDirectory: destination });

        assert.equal(result.error?.message, 'processor exploded');
        assert.equal(fs.existsSync(destination), false);
      });

      it('never removes a directory that existed before the call', async () => {
        processMock.mock.mockImplementation(async () => failing);

        await initCommand.execute({ ...CREATION, workingDirectory: validDir });

        assert.ok(fs.statSync(validDir).isDirectory());
      });

      it('leaves a created directory that now has content', async () => {
        const destination = fresh('partial');
        processMock.mock.mockImplementation(async () => {
          fs.writeFileSync(path.join(destination, 'partial.json'), '{}');
          return failing;
        });

        const result = await initCommand.execute({ ...CREATION, workingDirectory: destination });

        assert.equal(result.error?.message, 'init failed');
        assert.deepEqual(fs.readdirSync(destination), ['partial.json']);
      });
    });
  });

  it('should execute conversion with from parameter', async () => {
    await initCommand.execute({ workingDirectory: validDir, from: SYS_ID, auth: 'test-auth' });

    assertCalledWith(
      mockExecutor.process,
      process.execPath,
      [SDK_BIN, 'init', `--from=${SYS_ID}`, '--auth=test-auth'],
      validDir
    );
    assertCalledWith(sessionInstance.setWorkingDirectory, validDir);
  });

  it('should execute creation with all required parameters, honoring an explicit auth', async () => {
    const ensureAuthValidated = mock.fn(async () => undefined);
    const result = await new InitCommand(mockExecutor, ensureAuthValidated)
      .execute({ ...CREATION, template: 'typescript.react', auth: 'test-auth', workingDirectory: validDir });

    // Creation reads the vendor prefix of the --auth instance (or, without it,
    // of the CLI default profile), so an explicit alias is passed, not dropped.
    assertCalledWith(
      mockExecutor.process,
      process.execPath,
      [SDK_BIN, 'init', '--appName=Test App', '--packageName=test-app', '--scopeName=x_test_scope', '--template=typescript.react', '--auth=test-auth'],
      validDir
    );
    assertNotCalled(ensureAuthValidated);
    assertCalledWith(sessionInstance.setWorkingDirectory, validDir);
    assert.ok(result.output.includes(
      'Running this command contacts the instance of auth profile test-auth to read its vendor prefix, and warns when scopeName does not start with it; ' +
      'the project is created either way. It also contacts the npm registry for the latest SDK version and the template packages.'
    ), result.output);
  });

  describe('creation targeting (now-sdk init is not offline)', () => {
    it('targets the session alias when no auth is given', async () => {
      sessionInstance.getAuthAlias.mock.mockImplementation(() => 'session-auth');
      const ensureAuthValidated = mock.fn(async () => undefined);

      const result = await new InitCommand(mockExecutor, ensureAuthValidated).execute({ ...CREATION, workingDirectory: validDir });

      assertProcessCalledWithSdkArgs(containsAll(['--auth=session-auth']), validDir, "'--auth=session-auth'");
      assertNotCalled(ensureAuthValidated);
      assert.ok(result.output.includes('contacts the instance of auth profile session-auth'), result.output);
    });

    it('validates the configured instance lazily, and uses the alias it finds', async () => {
      const ensureAuthValidated = mock.fn(async () => {
        sessionInstance.getAuthAlias.mock.mockImplementation(() => 'validated-auth');
      });

      await new InitCommand(mockExecutor, ensureAuthValidated).execute({ ...CREATION, workingDirectory: validDir });

      assertCalledTimes(ensureAuthValidated, 1);
      assertProcessCalledWithSdkArgs(containsAll(['--auth=validated-auth']), validDir, "'--auth=validated-auth'");
    });

    it('passes no --auth without any alias, and says the CLI default profile is contacted', async () => {
      const result = await initCommand.execute({ ...CREATION, workingDirectory: validDir });

      const sdkArgs = processMock.mock.calls[0].arguments[1];
      assert.ok(!hasOption(sdkArgs, '--auth'), `unexpected --auth: ${inspect(sdkArgs)}`);
      assert.ok(result.output.includes(
        "contacts the instance of the CLI's default auth profile, if one is set (pass auth to choose the instance)"
      ), result.output);
    });

    it('adds no network note to a conversion', async () => {
      const result = await initCommand.execute({ from: SYS_ID, auth: 'dev', workingDirectory: validDir });

      assert.ok(!result.output.includes('Running this command contacts'), result.output);
    });
  });

  it('should succeed for an explicit conversion intent with complete arguments', async () => {
    const result = await initCommand.execute({
      intent: 'conversion',
      from: SYS_ID,
      workingDirectory: validDir,
      auth: 'test-auth',
    });

    assert.equal(result.success, true);
    assert.ok(mockExecutor.process.mock.callCount() > 0);
  });

  it('should succeed for an explicit creation intent with complete arguments', async () => {
    const result = await initCommand.execute({ intent: 'creation', ...CREATION, workingDirectory: validDir });

    assert.equal(result.success, true);
    assert.ok(mockExecutor.process.mock.callCount() > 0);
  });

  it('should refuse a from that is neither a sys_id nor an absolute path', async () => {
    const result = await initCommand.execute({ workingDirectory: validDir, from: 'invalid-sys-id' });

    assertRefused(result,
      'from must be an absolute path, not "invalid-sys-id". Supply an instance sys_id (32 hexadecimal characters) ' +
      'or the absolute path of a scoped application directory to convert.');
  });

  for (const [scopeName, message] of [
    ['x_nineteen_chars_xx', /scopeName cannot be longer than 18 characters/],
    ['x_my scope', /scopeName cannot contain spaces/],
  ] as const) {
    it(`should refuse the creation scopeName ${JSON.stringify(scopeName)}`, async () => {
      const result = await initCommand.execute({ ...CREATION, scopeName, workingDirectory: validDir });

      assertRefused(result, message);
      assertNotCalled(mockExecutor.process);
    });
  }

  it('should accept a scopeName of exactly 18 characters', async () => {
    const result = await initCommand.execute({ ...CREATION, scopeName: 'x_eighteen_chars_x', workingDirectory: validDir });

    assert.equal(result.success, true);
  });

  it('should offer exactly the templates the bundled now-sdk init accepts', () => {
    // The CLI's own --template choices, read from the bundled CLI's help, not from a copy.
    // sdkCli.js is mocked in this file; tests run from the repository root.
    const cli = path.resolve('node_modules/@servicenow/sdk/bin/index.js');
    const help = execFileSync(process.execPath, [cli, 'init', '--help'], { encoding: 'utf8' });
    const choices = help.match(/\[choices: ([^\]]+)\]/)?.[1];
    assert.ok(choices, `no --template choices in:\n${help}`);
    const cliTemplates = [...choices.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual([...VALID_TEMPLATES].sort(), cliTemplates.sort());
  });

  it('should pass packageName to a conversion, so the command does not stop to prompt for it', async () => {
    await initCommand.execute({ workingDirectory: validDir, from: SYS_ID, auth: 'test-auth', packageName: 'converted-app' });

    assertCalledWith(
      mockExecutor.process,
      process.execPath,
      [SDK_BIN, 'init', `--from=${SYS_ID}`, '--packageName=converted-app', '--auth=test-auth'],
      validDir
    );
  });

  it('should infer conversion, not creation, when from and packageName are both given', async () => {
    const result = await initCommand.execute({ workingDirectory: validDir, from: SYS_ID, auth: 'test-auth', packageName: 'converted-app' });

    assert.equal(result.success, true);
    assert.ok(!mockExecutor.process.mock.calls[0].arguments[1].some((entry: string) => entry.startsWith('--appName')));
  });

  describe('local conversion source', () => {
    it('passes the canonical source to the SDK without triggering auth validation', async (t) => {
      const source = legacyApp('source');
      const link = fresh('source-link');
      try {
        fs.symlinkSync(source, link, 'dir');
      } catch {
        t.skip('symlinks need privileges here');
        return;
      }
      const ensureAuthValidated = mock.fn(async () => undefined);

      await new InitCommand(mockExecutor, ensureAuthValidated).execute({ workingDirectory: validDir, from: `${link}${path.sep}` });

      assertNotCalled(ensureAuthValidated);
      assertCalledWith(mockExecutor.process, process.execPath, [SDK_BIN, 'init', `--from=${source}`], validDir);
    });

    it('accepts an application record in the update/ or scope/ subdirectory', async () => {
      for (const subdir of ['update', 'scope']) {
        const source = legacyApp(`source-${subdir}`, subdir);
        processMock.mock.resetCalls();

        const result = await initCommand.execute({ workingDirectory: directoryWith('dest'), from: source });

        assert.equal(result.success, true, result.error?.message);
      }
    });

    // The SDK runs in the destination, so a relative source would name a
    // different directory there than it did here, and ~ is never expanded in argv.
    for (const from of ['legacy', './legacy', '~/legacy']) {
      it(`refuses the relative source ${JSON.stringify(from)}, even when it exists relative to the server`, async (t) => {
        legacyApp('legacy');
        fs.renameSync(path.join(root, `legacy-${count}`), path.join(root, 'legacy'));
        t.after(() => fs.rmSync(path.join(root, 'legacy'), { recursive: true, force: true }));
        t.mock.method(process, 'cwd', () => root);
        const ensureAuthValidated = mock.fn(async () => undefined);

        const result = await new InitCommand(mockExecutor, ensureAuthValidated).execute({ workingDirectory: validDir, from });

        assertRefused(result, new RegExp(`^from must be an absolute path, not "${from.replace(/[.~/]/g, '\\$&')}"`));
        assertNotCalled(ensureAuthValidated);
      });
    }

    it('refuses a directory with no application record, such as a Fluent project', async () => {
      const result = await initCommand.execute({ workingDirectory: validDir, from: fluentProject('fluent-source') });

      assertRefused(result, /^from holds no application record: .*sys_app_<sys_id>\.xml/);
    });

    it('refuses a destination inside the source, and creates nothing', async () => {
      const source = legacyApp('source');
      const destination = path.join(source, 'converted');

      const result = await initCommand.execute({ from: source, workingDirectory: destination });

      assertRefused(result, /^workingDirectory must not be the conversion source or inside it: /);
      assert.equal(fs.existsSync(destination), false);
    });

    it('accepts a destination next to the source', async () => {
      const source = legacyApp('source');

      const result = await initCommand.execute({ from: source, workingDirectory: `${source}-converted` });

      assert.equal(result.success, true, result.error?.message);
      assertCalledWith(mockExecutor.process, process.execPath, [SDK_BIN, 'init', `--from=${source}`], `${source}-converted`);
    });

    it('refuses the filesystem root as a source', async () => {
      const result = await initCommand.execute({ workingDirectory: validDir, from: path.parse(root).root });

      assertRefused(result, /^from must identify an application directory, not /);
    });

    it('honors an explicit auth alias without lazy validation', async () => {
      const source = legacyApp('source');
      const ensureAuthValidated = mock.fn(async () => undefined);

      await new InitCommand(mockExecutor, ensureAuthValidated).execute({ workingDirectory: validDir, from: source, auth: 'explicit-local-auth' });

      assertNotCalled(ensureAuthValidated);
      assertProcessCalledWithSdkArgs(containsAll(['--auth=explicit-local-auth', `--from=${source}`]), validDir, "'--auth explicit-local-auth'");
    });
  });

  // `init --from <sys_id>` pulls the sys_app record's application from a live
  // instance into the cwd, so its destination follows the same rule: an
  // absolute, empty (or new) directory.
  describe('instance conversion destination', () => {
    it('refuses a populated destination', async () => {
      const result = await initCommand.execute({ from: SYS_ID, auth: 'dev', workingDirectory: directoryWith('populated', { 'notes.txt': '' }) });

      assertRefused(result, /^workingDirectory is not empty: /);
    });

    for (const workingDirectory of ['converted', '~/converted']) {
      it(`refuses the destination ${JSON.stringify(workingDirectory)}`, async () => {
        const result = await initCommand.execute({ from: SYS_ID, auth: 'dev', workingDirectory });

        assertRefused(result, /^workingDirectory must be an absolute path, not /);
      });
    }

    it('accepts a new directory under an existing parent', async () => {
      const destination = fresh('instance-new');

      const result = await initCommand.execute({ from: SYS_ID, auth: 'dev', workingDirectory: destination });

      assert.equal(result.success, true, result.error?.message);
      assertCalledWith(mockExecutor.process, process.execPath, [SDK_BIN, 'init', `--from=${SYS_ID}`, '--auth=dev'], destination);
    });
  });

  it('should lazily validate auth for sys_id conversion without an alias', async () => {
    const ensureAuthValidated = mock.fn(async () => undefined);
    const instanceConversionCommand = new InitCommand(mockExecutor, ensureAuthValidated);

    await instanceConversionCommand.execute({ workingDirectory: validDir, from: SYS_ID });

    assertCalledTimes(ensureAuthValidated, 1);
  });

  it('should fail validation for non-existent local path', async () => {
    const missing = fresh('missing-source');
    const result = await initCommand.execute({ workingDirectory: validDir, from: missing });

    assertRefused(result, new RegExp(`^from does not exist: ${missing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`));
  });

  it('should validate template parameter', async () => {
    const result = await initCommand.execute({ ...CREATION, template: 'invalid-template', workingDirectory: validDir });

    assert.equal(result.success, false);
    assert.ok(result.error?.message.includes("Argument 'template' must be one of: base, javascript.react"));
    assertNotCalled(mockExecutor.process);
  });

  it('should determine intent from from parameter', async () => {
    await initCommand.execute({ workingDirectory: validDir, from: SYS_ID });

    assertProcessCalledWithSdkArgs(containsAll([`--from=${SYS_ID}`]), validDir, "'--from <sys_id>'");
  });

  it('should determine intent from creation parameters', async () => {
    await initCommand.execute({ ...CREATION, workingDirectory: validDir });

    assertProcessCalledWithSdkArgs(containsAll(['--appName=Test App']), validDir, '--appName=Test App');
  });
});
