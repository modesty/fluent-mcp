/**
 * init_fluent_app returns command text that a person runs in a shell
 * (CLICmdWriter). This checks the whole path writer → POSIX shell → yargs: the
 * real InitCommand and CLICmdWriter produce the text, /bin/sh splits it into
 * argv, and the bundled CLI's own yargs-parser reads --appName from that argv.
 * The app name must come back exactly, and nothing in it may become an option.
 * The text must also start the SDK in the new project directory, since
 * `now-sdk init` writes the project into its cwd.
 */
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { InitCommand } from '../../src/tools/commands/initCommand.js';
import { CLICmdWriter } from '../../src/tools/processors/cliCmdWriter.js';
import { cliOption } from '../../src/tools/commands/cliArgv.js';
import { parseCliOption } from '../support/argv.js';
import { SHELLS, launchNodeCommandText, shellSplit } from '../support/shell.js';

/** The --appName value the CLI parses from the argv, plus every other option entry. */
function readArgv(argv: string[]): { appName: unknown; options: string[] } {
  const entries = argv.filter((arg) => arg.startsWith('--appName='));
  assert.equal(entries.length, 1, `one --appName entry in ${JSON.stringify(argv)}`);
  return {
    appName: parseCliOption(entries[0], '--appName'),
    options: argv.filter((arg) => arg.startsWith('-') && !arg.startsWith('--appName=')),
  };
}

const EXPECTED_OPTIONS = ['--packageName=my-app', '--scopeName=x_my_app', '--template=typescript.basic'];

describe('init_fluent_app command text: writer → shell → yargs', { skip: process.platform === 'win32' }, () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-init-shell-')));
  after(() => fs.rmSync(root, { recursive: true, force: true }));

  let count = 0;
  /** The full first line of the result: `cd <dir> && <command>`. */
  const resultText = async (appName: string, workingDirectory = path.join(root, `app-${++count}`)): Promise<string> => {
    const result = await new InitCommand(new CLICmdWriter()).execute({
      intent: 'creation', appName, packageName: 'my-app', scopeName: 'x_my_app', template: 'typescript.basic',
      workingDirectory,
    });
    assert.equal(result.success, true, result.output);
    return result.output.split('\n')[0];
  };
  /** The command after the leading `cd <dir> && `. */
  const commandText = async (appName: string): Promise<string> => {
    const text = await resultText(appName);
    return text.slice(text.indexOf(' && ') + ' && '.length);
  };

  for (const shell of SHELLS) {
    it(`starts the SDK in the new, quoted project directory under ${shell.name}`, async () => {
      const workingDirectory = path.join(root, `it's "new" $HOME ${shell.name}`);
      const launched = launchNodeCommandText(await resultText('My App', workingDirectory), shell);

      assert.equal(launched.cwd, workingDirectory);
      assert.equal(readArgv(launched.argv).appName, 'My App');
      assert.equal(launched.argv[1], 'init');
    });
  }

  for (const appName of [
    "'My App' --help ''", "'My App'", 'My App', "it's mine", '"x" --help', 'My "Best" App', 'Simple',
  ]) {
    it(`keeps ${JSON.stringify(appName)} as the app name, with no extra option`, async () => {
      const { appName: parsed, options } = readArgv(shellSplit(await commandText(appName)));
      assert.equal(parsed, appName);
      assert.deepEqual(options, EXPECTED_OPTIONS);
    });
  }

  for (const shell of SHELLS) {
    it(`keeps "=node" as the app name under ${shell.name} (zsh equals expansion)`, async () => {
      const { appName: parsed, options } = readArgv(shellSplit(await commandText('=node'), shell));
      assert.equal(parsed, '=node');
      assert.deepEqual(options, EXPECTED_OPTIONS);
    });
  }

  it('removes double quotes the caller meant as shell quoting', async () => {
    assert.equal(readArgv(shellSplit(await commandText('"My App"'))).appName, 'My App');
  });

  it('negative control: wrapping the entry in plain double quotes exposes --help', () => {
    const argv = shellSplit(`init "${cliOption('--appName', "'My App' --help ''")}"`);
    assert.ok(argv.includes('--help'), JSON.stringify(argv));
  });
});
