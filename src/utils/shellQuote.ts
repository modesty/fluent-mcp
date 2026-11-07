/**
 * POSIX shell quoting for command text a person runs in a terminal. CLICmdWriter
 * applies it to every entry; the executor spawns shell-free and never needs it.
 */

/** Characters sh, bash and zsh pass through unquoted, with no splitting or globbing. */
const SHELL_SAFE = /^[A-Za-z0-9_@%+=:,./-]+$/;

/**
 * zsh "equals expansion" turns an unquoted `=cmd` into the path of `cmd`
 * (`=node` → `/usr/bin/node`). It applies at the start of a word (EQUALS, on by
 * default) and, with MAGIC_EQUAL_SUBST, also where an `anything=value` word's
 * value starts and after each `:` in it (`--auth==node`, `--a=x:=node`). An `=`
 * in any of those positions forces quoting. This is conservative: `==` anywhere
 * counts, not only right after the first `=`.
 */
const ZSH_EQUALS_EXPANSION = /(?:^|[=:])=/;

/**
 * Quote one argv entry so that sh, bash or zsh (also with MAGIC_EQUAL_SUBST)
 * yields exactly that entry. A safe entry is returned unchanged; anything else
 * is wrapped in single quotes, inside which no shell expands anything, and each
 * embedded `'` becomes `'\''` (close, escaped quote, reopen).
 * @param entry One argv entry
 * @returns The entry as shell text
 */
export function shellQuote(entry: string): string {
  const safe = SHELL_SAFE.test(entry) && !ZSH_EQUALS_EXPANSION.test(entry);
  return safe ? entry : `'${entry.replaceAll("'", '\'\\\'\'')}'`;
}
