/**
 * What a shell makes of command text: the argv it would pass on. Used to check
 * CLICmdWriter output (text a person runs) end to end, and where a command it
 * starts runs. POSIX shells only.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** A shell to split with: the executable, its flags, and setup run before the text. */
export interface Shell {
  name: string;
  command: string;
  flags: string[];
  setup: string;
}

export const SH: Shell = { name: 'sh', command: '/bin/sh', flags: [], setup: '' };
/** zsh without rc files (`-f`), so only its default options apply. */
export const ZSH: Shell = { name: 'zsh', command: 'zsh', flags: ['-f'], setup: '' };
/** zsh with MAGIC_EQUAL_SUBST, which expands `=cmd` and `~` inside `anything=value` words too. */
export const ZSH_MAGIC_EQUAL_SUBST: Shell = { ...ZSH, name: 'zsh (MAGIC_EQUAL_SUBST)', setup: 'setopt magic_equal_subst; ' };

/** True when zsh is installed (it is optional on Linux CI). */
export const zshAvailable = spawnSync('zsh', ['-f', '-c', 'true']).status === 0;

/** The shells available here, for tests that loop over them. */
export const SHELLS: Shell[] = zshAvailable ? [SH, ZSH, ZSH_MAGIC_EQUAL_SUBST] : [SH];

/** The argv `shell` produces from `text`, read back NUL-separated through printf. */
export function shellSplit(text: string, shell: Shell = SH): string[] {
  const run = spawnSync(shell.command, [...shell.flags, '-c', `${shell.setup}printf '%s\\0' ${text}`], { encoding: 'utf-8' });
  assert.equal(run.status, 0, `${shell.name}: ${run.stderr}`);
  return run.stdout.split('\0').slice(0, -1);
}

/** What a Node process started by command text saw: its cwd and its argv after the executable. */
export interface NodeLaunch {
  cwd: string;
  argv: string[];
}

let probe: string | undefined;

/**
 * Run command text that starts Node (as the writer's SDK commands do) under
 * `shell`, and report where and with what argv Node started. A preload module
 * (`NODE_OPTIONS=--import`) prints both and exits before the script runs, so
 * the SDK itself never starts.
 */
export function launchNodeCommandText(text: string, shell: Shell = SH): NodeLaunch {
  if (!probe) {
    const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-node-probe-')));
    process.once('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
    probe = path.join(dir, 'probe.mjs');
    fs.writeFileSync(probe, 'process.stdout.write(JSON.stringify({ cwd: process.cwd(), argv: process.argv.slice(1) }));\nprocess.exit(0);\n');
  }
  const run = spawnSync(shell.command, [...shell.flags, '-c', `${shell.setup}${text}`], {
    encoding: 'utf-8',
    env: { ...process.env, NODE_OPTIONS: `--import=${pathToFileURL(probe).href}` },
  });
  assert.equal(run.status, 0, `${shell.name}: ${run.stderr}`);
  return JSON.parse(run.stdout) as NodeLaunch;
}
