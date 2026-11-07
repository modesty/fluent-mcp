/**
 * Read `now-sdk` argv the way the CLI does. A value-taking option is one
 * `--flag=value` entry (see src/tools/commands/cliArgv.ts), and its value is
 * what the bundled CLI's own yargs-parser makes of it, not the raw text after
 * "=" (the parser strips one matching pair of outer quotes in that form).
 */
import { createRequire } from 'node:module';

type YargsParse = (
  args: string[],
  options: { string?: string[]; configuration?: Record<string, boolean> },
) => Record<string, unknown>;

/**
 * The yargs-parser the bundled CLI loads: resolved along its own require chain
 * (@servicenow/sdk → @servicenow/sdk-cli → yargs → yargs-parser), so a nested
 * copy would be found too.
 */
function loadCliParser(): YargsParse {
  const fromHere = createRequire(import.meta.url);
  const fromSdk = createRequire(fromHere.resolve('@servicenow/sdk/core'));
  const fromCli = createRequire(fromSdk.resolve('@servicenow/sdk-cli'));
  const fromYargs = createRequire(fromCli.resolve('yargs'));
  return fromYargs('yargs-parser') as YargsParse;
}

let cliParser: YargsParse | undefined;

/** What the bundled CLI's parser reads for `flag` from one argv entry, as a string. */
export function parseCliOption(entry: string, flag: string): unknown {
  cliParser ??= loadCliParser();
  const key = flag.replace(/^--/, '');
  return cliParser([entry], { string: [key], configuration: { 'camel-case-expansion': false } })[key];
}

/**
 * The value the CLI parses from `--flag=value`, or undefined when the option was
 * not emitted with a value.
 */
export function optionValue(argv: readonly string[], flag: string): string | undefined {
  const entry = argv.find((arg) => arg.startsWith(`${flag}=`));
  return entry === undefined ? undefined : String(parseCliOption(entry, flag));
}

/** True when the option appears in either form (`--flag` or `--flag=value`). */
export function hasOption(argv: readonly string[], flag: string): boolean {
  return argv.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}
