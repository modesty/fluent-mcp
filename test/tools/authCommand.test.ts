import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { configFixture, loggerFixture, sdkCliFixture } from '../support/fixtures.js';
import type { CommandProcessor, CommandResult } from '../../src/utils/types.js';

// AuthCommand reads the neutral project root from config and resolves the
// bundled SDK CLI; both, and the logger, are replaced with fixtures.
mock.module('../../src/config.js', configFixture().mockOptions);
mock.module('../../src/utils/logger.js', loggerFixture().mockOptions);
mock.module('../../src/utils/sdkCli.js', sdkCliFixture().mockOptions);

const { AuthCommand, LIST_PROFILES_SCRIPT, parseAuthProfiles } = await import('../../src/tools/commands/authCommand.js');

const SDK_BIN = '/test/node_modules/@servicenow/sdk/bin/index.js';
// configFixture().getProjectRootPath() returns this neutral root; AuthCommand uses it as cwd.
const PROJECT_ROOT = '/test';

type ProcessFn = CommandProcessor['process'];

function createMockProcessor() {
  const processFn = mock.fn<ProcessFn>(async () => ({ success: true, output: '', exitCode: 0 }) as CommandResult);
  return { process: processFn } satisfies CommandProcessor;
}

/**
 * A stub install layout: `<root>/node_modules/@servicenow/sdk/bin/index.js` beside
 * an sdk-cli whose `fetchCredentials` is `fetchBody`. The logger stub records the
 * stream it is moved to on stderr, so a test can see it moved before any read.
 */
function stubSdk(fetchBody: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-auth-reader-'));
  const scope = path.join(root, 'node_modules', '@servicenow');
  const bin = path.join(scope, 'sdk', 'bin', 'index.js');
  const cliDist = path.join(scope, 'sdk-cli', 'dist');
  for (const file of [bin, path.join(cliDist, 'auth', 'index.js'), path.join(cliDist, 'logger', 'index.js')]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  fs.writeFileSync(bin, '');
  fs.writeFileSync(path.join(scope, 'sdk-cli', 'package.json'), JSON.stringify({ name: '@servicenow/sdk-cli', main: 'dist/index.js' }));
  fs.writeFileSync(
    path.join(cliDist, 'logger', 'index.js'),
    "console.log('[now-sdk] logger loaded');\n" +
    "exports.logger = { setStream: (s) => { process.stderr.write('stream=' + s + '\\n'); exports.logger.stream = s; } };\n"
  );
  fs.writeFileSync(
    path.join(cliDist, 'auth', 'index.js'),
    "const { logger } = require('../logger');\n" +
    `exports.fetchCredentials = async () => { if (logger.stream !== 'stderr') throw new Error('logger still on stdout'); ${fetchBody} };\n`
  );
  return root;
}

async function runScript(root: string) {
  const bin = path.join(root, 'node_modules', '@servicenow', 'sdk', 'bin', 'index.js');
  try {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, ['-e', LIST_PROFILES_SCRIPT, bin], { cwd: os.tmpdir() });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const { code, stdout, stderr } = error as { code: number; stdout: string; stderr: string };
    return { code, stdout, stderr };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('AuthCommand', () => {
  let authCommand: InstanceType<typeof AuthCommand>;
  let processor: ReturnType<typeof createMockProcessor>;

  beforeEach(() => {
    processor = createMockProcessor();
    authCommand = new AuthCommand(processor);
  });

  it('runs the profile reader script with the bundled SDK bin, from the neutral package directory', async () => {
    const result = await authCommand.execute();

    assert.equal(processor.process.mock.callCount(), 1);
    const [command, argv, cwd, timeoutMs, signal] = processor.process.mock.calls[0].arguments;
    assert.equal(command, process.execPath);
    assert.deepEqual(argv, ['-e', LIST_PROFILES_SCRIPT, SDK_BIN]);
    assert.equal(cwd, PROJECT_ROOT);
    assert.equal(timeoutMs, undefined);
    assert.equal(signal, undefined);
    assert.equal(result.success, true);
  });

  // The profile store and its default profile are shared by every now-sdk run
  // on the machine, so the server has no way to write them (W9 review).
  for (const args of [{ add: 'https://dev.service-now.com' }, { debug: true }]) {
    it(`accepts no arguments: rejects ${Object.keys(args)[0]}`, async () => {
      // The internal AuthCommand is held to the same strict schema as tools/call.
      await assert.rejects(authCommand.execute(args), /Input validation error/);
      assert.equal(processor.process.mock.callCount(), 0);
    });
  }
});

describe('LIST_PROFILES_SCRIPT', () => {
  it('prints one envelope with alias, host, type and isDefault, never the username', async () => {
    const run = await runScript(stubSdk(
      "return new Map([['x]\\n[spoofed', { instanceUrl: 'https://a.invalid', type: 'basic', isDefault: true, username: 'secret-user' }], " +
      "['o', { instanceUrl: 'https://b.invalid', type: 'oauth', isDefault: false }]]);"
    ));

    assert.equal(run.code, 0);
    assert.match(run.stderr, /stream=stderr/);
    assert.ok(!run.stdout.includes('secret-user'));
    // The logger's load-time line stays before the envelope, which is the last line.
    assert.equal(run.stdout.trim().split('\n').length, 2);
    assert.deepEqual(parseAuthProfiles(run.stdout), [
      { alias: 'x]\n[spoofed', host: 'https://a.invalid', type: 'basic', isDefault: true },
      { alias: 'o', host: 'https://b.invalid', type: 'oauth', isDefault: false },
    ]);
  });

  it('reports the SDK error, with its cause, as an ok:false envelope and exit 1', async () => {
    const run = await runScript(stubSdk(
      "throw new Error('Stored credentials at /s/credentials.enc could not be read.', { cause: new Error('bad tag') });"
    ));

    assert.equal(run.code, 1);
    const envelope = JSON.parse(run.stdout.trim().split('\n').at(-1) ?? '');
    assert.deepEqual(envelope, {
      ok: false,
      error: { message: 'Stored credentials at /s/credentials.enc could not be read.\n  Caused by: bad tag' },
    });
    assert.equal(parseAuthProfiles(run.stdout), undefined);
  });
});
