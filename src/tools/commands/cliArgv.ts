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

/**
 * How one command argument maps to a CLI flag:
 * - `string`: value-taking option (`--flag=value` via `cliOption`)
 * - `{ flag }`: boolean flag emitted when truthy
 * - `{ flag, negatable: true }`: boolean flag whose `false` emits `--no-<flag>`
 * - `{ flag, negateOnly: true }`: default-true CLI flag where only `false` emits `--no-<flag>`
 */
export type FlagConfig =
  | string
  | {
      flag: string;
      negatable?: boolean;
      negateOnly?: boolean;
    };

export interface BuildSdkArgvOptions {
  /** Leading CLI entry args (from `resolveSdkCli().baseArgs`). */
  baseArgs: readonly string[];
  /** Subcommand token(s), e.g. `'build'`, `['cicd', 'test', 'logs']`, or `[]`. */
  subcommand?: string | readonly string[];
  /** Validated tool arguments object. */
  args: Record<string, unknown>;
  /** Argument-name → CLI flag map. */
  flags?: Record<string, FlagConfig>;
  /** Positional arguments placed right after the subcommand and before flags. */
  positionals?: readonly string[];
  /** Fixed CLI tokens appended after mapped flags (before `--debug`). */
  fixedFlags?: readonly string[];
  /** Append `--debug` when `args.debug` is truthy (default: true). */
  includeDebug?: boolean;
}

/**
 * Pure argv builder for `now-sdk` invocations. Every value-taking option is
 * encoded through `cliOption` (`--flag=value`) so a "-"-leading value can never
 * become another option.
 */
export function buildSdkArgv({
  baseArgs,
  subcommand,
  args,
  flags = {},
  positionals = [],
  fixedFlags = [],
  includeDebug = true,
}: BuildSdkArgvOptions): string[] {
  const subcommands = subcommand === undefined
    ? []
    : typeof subcommand === 'string'
      ? [subcommand]
      : subcommand;
  const argv: string[] = [...baseArgs, ...subcommands, ...positionals];

  for (const [argName, flagConfig] of Object.entries(flags)) {
    const value = args[argName];
    if (value === undefined || value === null || value === '') continue;
    if (typeof flagConfig === 'string') {
      argv.push(cliOption(flagConfig, value));
    } else if (flagConfig.negateOnly) {
      if (value === false) argv.push(flagConfig.flag.replace(/^--/, '--no-'));
    } else if (value) {
      argv.push(flagConfig.flag);
    } else if (flagConfig.negatable) {
      argv.push(flagConfig.flag.replace(/^--/, '--no-'));
    }
  }

  argv.push(...fixedFlags);
  if (includeDebug && args.debug) {
    argv.push('--debug');
  }
  return argv;
}
