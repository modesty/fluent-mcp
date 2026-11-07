/**
 * CLICmdWriter returns command text that a person runs in a shell, so it is the
 * one place a shell sees the argv. Every entry is shell-escaped there: a POSIX
 * shell must hand back exactly the argv the command built, and nothing in an
 * entry may run, split, or expand. The text also enters the project directory
 * itself (`cd '<dir>' && …`), because the SDK CLI works in its cwd.
 */
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CLICmdWriter } from '../../src/tools/processors/cliCmdWriter.js';
import { DependenciesCommand } from '../../src/tools/commands/dependenciesCommand.js';
import { parseCliOption } from '../support/argv.js';
import { SHELLS, launchNodeCommandText, shellSplit } from '../support/shell.js';

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-cmd-writer-')));
after(() => fs.rmSync(root, { recursive: true, force: true }));

/** A project directory whose name a shell would split, expand or end a quote on. */
const awkward = path.join(root, "it's a $HOME `dir`");
fs.mkdirSync(awkward);

/** The command after the leading `cd <dir> && `, checked to enter `cwd`. */
function commandPart(output: string, cwd: string): string {
  const [cdWord, ...rest] = output.split(' && ');
  assert.deepEqual(shellSplit(cdWord), ['cd', cwd], output);
  return rest.join(' && ');
}

describe('CLICmdWriter', () => {
  it('leaves plain entries unquoted', async () => {
    const result = await new CLICmdWriter().process('/usr/bin/node', ['/sdk/bin/index.js', 'init', '--scopeName=x_my_app'], root);
    assert.equal(result.output, `cd ${root} && /usr/bin/node /sdk/bin/index.js init --scopeName=x_my_app`);
  });

  it('writes the bare command when there is no directory to enter', async () => {
    const result = await new CLICmdWriter().process('/usr/bin/node', ['--version']);
    assert.equal(result.output, '/usr/bin/node --version');
  });

  it('a POSIX shell yields exactly the argv, and runs nothing in it', { skip: process.platform === 'win32' }, async () => {
    const sentinel = path.join(root, 'ran');
    const argv = [
      'init', '--appName=My App', '--from=a;b', `--x=$(touch ${sentinel})`, `--y=\`touch ${sentinel}\``,
      '--z=$HOME', `--q="double" 'single'`, '--g=*', '--e=', 'a|b&c', '--n=line\tend',
    ];
    const result = await new CLICmdWriter().process('/path with space/node', argv, root);

    assert.deepEqual(shellSplit(commandPart(result.output, root)), ['/path with space/node', ...argv]);
    assert.equal(fs.existsSync(sentinel), false);
  });

  for (const shell of SHELLS) {
    it(`the command runs in the quoted directory under ${shell.name}`, { skip: process.platform === 'win32' }, async () => {
      const result = await new CLICmdWriter().process(process.execPath, ['-e', '0', '--', 'a b'], awkward);

      assert.deepEqual(launchNodeCommandText(result.output, shell), { cwd: awkward, argv: ['a b'] });
    });
  }
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

    it(`starts the SDK in the project directory under ${shell.name}`, async () => {
      const result = await new DependenciesCommand(new CLICmdWriter()).execute({ auth: 'dev', workingDirectory: awkward });
      assert.equal(result.success, true, result.output);

      const launched = launchNodeCommandText(result.output, shell);
      assert.equal(launched.cwd, awkward);
      assert.deepEqual(launched.argv.slice(1), ['dependencies', '--auth=dev']);
    });
  }
});
