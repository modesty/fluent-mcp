/**
 * What a shell makes of command text: the argv it would pass on. Used to check
 * CLICmdWriter output (text a person runs) end to end. POSIX shells only.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

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
