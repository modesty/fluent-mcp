/**
 * CLICmdWriter returns command text that a person runs in a shell, so it is the
 * one place a shell sees the argv. Every entry is shell-escaped there: a POSIX
 * shell must hand back exactly the argv the command built, and nothing in an
 * entry may run, split, or expand. The text also enters the project directory
 * itself (`cd '<dir>' && …`), because the SDK CLI works in its cwd.
 */
import { spawnSync } from 'node:child_process';
import { after, afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CLICmdWriter } from '../../src/tools/processors/cliCmdWriter.js';
import { DependenciesCommand } from '../../src/tools/commands/dependenciesCommand.js';
import { shellQuote } from '../../src/utils/shellQuote.js';
import { parseCliOption } from '../support/argv.js';
import { captureStderr, withEnvironment } from '../support/fixtures.js';
import { SHELLS, launchNodeCommandText, shellSplit } from '../support/shell.js';

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-cmd-writer-')));
after(() => fs.rmSync(root, { recursive: true, force: true }));

const defaultCredDir = path.join(os.homedir(), '.now-sdk');
const defaultCredAssignment = `SN_SDK_CREDENTIALS_DIR=${shellQuote(defaultCredDir)}`;

/** A project directory whose name a shell would split, expand or end a quote on. */
const awkward = path.join(root, "it's a $HOME `dir`");
fs.mkdirSync(awkward);

/** The command after the leading `cd <dir> && `, checked to enter `cwd`. */
function commandPart(output: string, cwd: string): string {
  const [cdWord, ...rest] = output.split(' && ');
  assert.deepEqual(shellSplit(cdWord), ['cd', cwd], output);
  return rest.join(' && ');
}

let restoreEnv: () => void;
beforeEach(() => {
  restoreEnv = withEnvironment({ SN_SDK_CREDENTIALS_DIR: undefined, SN_SDK_KEY_SOURCE: undefined, SN_SDK_ENCRYPTION_KEY: undefined });
});
afterEach(() => restoreEnv());

describe('CLICmdWriter', () => {
  it('leaves plain entries unquoted and pins the default credential store directory', async () => {
    const result = await new CLICmdWriter().process('/usr/bin/node', ['/sdk/bin/index.js', 'init', '--scopeName=x_my_app'], root);
    assert.equal(
      result.output,
      `cd ${root} && SN_SDK_KEY_SOURCE=keyring ${defaultCredAssignment} /usr/bin/node /sdk/bin/index.js init --scopeName=x_my_app`
    );
  });

  it('writes just the provider, store directory, and command when there is no directory to enter', async () => {
    const result = await new CLICmdWriter().process('/usr/bin/node', ['--version']);
    assert.equal(result.output, `SN_SDK_KEY_SOURCE=keyring ${defaultCredAssignment} /usr/bin/node --version`);
  });

  it('a POSIX shell yields exactly the argv, and runs nothing in it', { skip: process.platform === 'win32' }, async () => {
    const sentinel = path.join(root, 'ran');
    const argv = [
      'init', '--appName=My App', '--from=a;b', `--x=$(touch ${sentinel})`, `--y=\`touch ${sentinel}\``,
      '--z=$HOME', `--q="double" 'single'`, '--g=*', '--e=', 'a|b&c', '--n=line\tend',
    ];
    const result = await new CLICmdWriter().process('/path with space/node', argv, root);

    assert.deepEqual(shellSplit(commandPart(result.output, root)), [
      'SN_SDK_KEY_SOURCE=keyring',
      `SN_SDK_CREDENTIALS_DIR=${defaultCredDir}`,
      '/path with space/node',
      ...argv,
    ]);
    assert.equal(fs.existsSync(sentinel), false);
  });

  it('refuses an invalid provider without disclosing its value', async () => {
    process.env.SN_SDK_KEY_SOURCE = 'invalid-provider-value';
    const result = await new CLICmdWriter().process('node', ['--version']);
    assert.equal(result.success, false);
    assert.match(result.error?.message ?? '', /SN_SDK_KEY_SOURCE/);
    assert.doesNotMatch(result.output, /invalid-provider-value/);
  });

  for (const shell of SHELLS) {
    it(`the command runs in the quoted directory and pins ~/.now-sdk even when the shell sets another SN_SDK_CREDENTIALS_DIR under ${shell.name}`, { skip: process.platform === 'win32' }, async () => {
      const result = await new CLICmdWriter().process(process.execPath, ['-e', '0', '--', 'a b'], awkward);

      assert.deepEqual(
        launchNodeCommandText(result.output, shell, { SN_SDK_CREDENTIALS_DIR: path.join(root, 'other-store') }),
        { cwd: awkward, argv: ['a b'], credDir: defaultCredDir }
      );
    });
  }
});

describe('download_fluent_dependencies metadata', () => {
  it('advertises honest writer metadata without openWorldHint or a long-running timeoutMs', () => {
    const command = new DependenciesCommand(new CLICmdWriter());
    assert.match(command.description, /Does NOT execute the command directly/i);
    assert.match(command.description, /returns a shell command/i);
    assert.deepStrictEqual(command.annotations, { readOnlyHint: true, idempotentHint: true });
    assert.equal(command.timeoutMs, undefined);
  });
});

describe('download_fluent_dependencies command text: writer → shell → yargs', { skip: process.platform === 'win32' }, () => {
  for (const shell of SHELLS) {
    for (const auth of [`'dev' alias --debug`, '=node', 'x:=node']) {
      it(`keeps auth ${JSON.stringify(auth)} as one --auth value under ${shell.name}`, async () => {
        const result = await new DependenciesCommand(new CLICmdWriter()).execute({ auth, workingDirectory: root });
        assert.equal(result.success, true, result.output);

        const argv = shellSplit(commandPart(result.output, root), shell);
        const entries = argv.filter((arg) => arg.startsWith('--auth='));
        assert.equal(entries.length, 1, JSON.stringify(argv));
        assert.equal(parseCliOption(entries[0], '--auth'), auth);
        assert.ok(!argv.includes('--debug'), JSON.stringify(argv));
      });
    }

    it(`carries the env-backed store into a clean terminal under ${shell.name}`, async (t) => {
      const serverKey = 'private-test-key-never-include-in-command';
      process.env.SN_SDK_KEY_SOURCE = 'env';
      process.env.SN_SDK_ENCRYPTION_KEY = serverKey;
      process.env.SN_SDK_CREDENTIALS_DIR = path.relative(process.cwd(), awkward);
      const logs = captureStderr(t);
      const result = await new DependenciesCommand(new CLICmdWriter()).execute({ auth: 'dev', workingDirectory: root });
      assert.equal(result.success, true, result.output);
      const command = result.output;
      assert.match(command, /export SN_SDK_ENCRYPTION_KEY in this terminal from the same secret/);
      assert.ok(!result.output.includes(serverKey) && !logs.join('').includes(serverKey));

      // Stop before the SDK loads. With a clean provider configuration the child
      // must receive the provider and directory from the command itself, and the
      // key solely from the terminal environment.
      const preload = path.join(root, 'env-probe.cjs');
      fs.writeFileSync(preload, `
        process.stdout.write(JSON.stringify({
          provider: process.env.SN_SDK_KEY_SOURCE,
          dir: process.env.SN_SDK_CREDENTIALS_DIR,
          usesTerminalKey: process.env.SN_SDK_ENCRYPTION_KEY === 'terminal-test-key',
        }));
        process.exit(Number(process.env.PROBE_EXIT_CODE || 0));
      `);
      const terminal = { PATH: process.env.PATH, NODE_OPTIONS: `--require="${preload}"` };
      const runInTerminal = (env: NodeJS.ProcessEnv) => spawnSync(shell.command, [...shell.flags, '-xc', shell.setup + command], {
        env, encoding: 'utf8',
      });
      const missing = runInTerminal({ ...terminal, PROBE_EXIT_CODE: '7' });
      assert.equal(missing.status, 7, missing.stderr);
      assert.match(missing.stderr, /For stored profiles, export SN_SDK_ENCRYPTION_KEY/);
      assert.deepEqual(JSON.parse(missing.stdout), { provider: 'env', dir: awkward, usesTerminalKey: false });
      const launched = runInTerminal({ ...terminal, SN_SDK_ENCRYPTION_KEY: 'terminal-test-key' });
      assert.ok(!launched.stderr.includes('terminal-test-key'), 'the terminal key leaked into shell tracing');
      assert.equal(launched.status, 0, launched.stderr);
      assert.deepEqual(JSON.parse(launched.stdout), { provider: 'env', dir: awkward, usesTerminalKey: true });
    });

    it(`starts the SDK in the project directory under ${shell.name}`, async () => {
      const result = await new DependenciesCommand(new CLICmdWriter()).execute({ auth: 'dev', workingDirectory: awkward });
      assert.equal(result.success, true, result.output);

      const launched = launchNodeCommandText(result.output, shell);
      assert.equal(launched.cwd, awkward);
      assert.deepEqual(launched.argv.slice(1), ['dependencies', '--auth=dev']);
    });
  }
});
