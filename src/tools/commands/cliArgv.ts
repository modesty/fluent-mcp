/**
 * How caller values become `now-sdk` argv entries.
 *
 * yargs reads any argv entry that begins with "-" as an option, including the
 * entry that follows a value-taking flag. `['--dev-notes', '--app-version=9']`
 * therefore sets `--app-version` and leaves `--dev-notes` empty: a free-text
 * value could rewrite any other option of the same command (verified against
 * the bundled CLI, SDK v4.14.0). Two rules close this:
 *  - an option and its value are always ONE entry, `--flag=value`, which yargs
 *    splits at the first "=" and never re-parses (a value may itself contain
 *    "=" or begin with "-"). In this form only, yargs-parser also strips ONE
 *    matching pair of outer quotes from the value (`stripQuotes`, applied to
 *    `--flag=value` but not to a separate value entry), so a value that is
 *    itself wrapped in matching quotes gets one extra pair for it to strip;
 *  - a positional value must not begin with "-". There is no equivalent form for
 *    positionals: after a `--` separator yargs leaves the command's positional
 *    unbound.
 */

/**
 * Whether yargs-parser would strip the outer quotes of `text` in `--flag=text`:
 * at least two characters, the first `'` or `"`, and the last the same.
 */
function isQuoteWrapped(text: string): boolean {
  return text.length >= 2 && (text[0] === '"' || text[0] === "'") && text.at(-1) === text[0];
}

/**
 * One option with its value, as a single argv entry that yargs parses back to
 * exactly `value`.
 * @param flag The option, e.g. `--auth`
 * @param value The value; stringified
 * @returns `--flag=value`, or `--flag="value"` when the value is itself wrapped
 *   in matching quotes (yargs strips the added pair, so `"error"` stays `"error"`)
 */
export function cliOption(flag: string, value: unknown): string {
  const text = String(value);
  return `${flag}=${isQuoteWrapped(text) ? `"${text}"` : text}`;
}

/**
 * Assert that a positional value cannot be read as an option.
 * @param value The positional value
 * @param argName The argument name (for error messages)
 * @returns The value, unchanged
 * @throws Error if the value begins with "-"
 */
export function assertNotOption(value: string, argName: string): string {
  if (value.startsWith('-')) {
    throw new Error(`Argument '${argName}' must not begin with "-": the CLI would read "${value}" as an option.`);
  }
  return value;
}
