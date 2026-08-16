/**
 * Validators for argument values the base shell-metacharacter sanitizer cannot
 * accept as-is: author-written prose (release notes, ATF test names), encoded
 * queries, and `--select` paths.
 *
 * Every one of these reaches the CLI as a single literal argv entry because the
 * process runner spawns the bundled CLI shell-free (see processRunner). The base
 * sanitizer is defense-in-depth for that path, so these values are screened by
 * the narrower rule that actually applies to them instead of a broad blacklist.
 */

/**
 * Control characters can obscure command boundaries in logs and are never valid
 * content for any argument screened here.
 */
// eslint-disable-next-line no-control-regex -- control characters are intentionally rejected
const CONTROL_CHARACTER_PATTERN = /[\x00-\x1f\x7f]/;

/**
 * The path grammar the SDK's `--select` extractor accepts (`@servicenow/sdk-cli`
 * `util/json-select.ts`): dot-separated property names, each optionally
 * subscripted with a non-negative integer — e.g. `records[0].sys_id`. The base
 * sanitizer rejects `[` and `]`, so bracket paths are validated against this
 * exact grammar rather than being refused outright.
 */
const SELECT_PATH_PATTERN = /^[A-Za-z0-9_$-]+(?:\[\d+\])*(?:\.[A-Za-z0-9_$-]+(?:\[\d+\])*)*$/;

/**
 * Stand-in handed to the base validator in place of a value it would reject, so
 * its required/type checks still run over the full argument set.
 */
const PLACEHOLDER = 'placeholder';

/**
 * Assert that a free-text value is a string carrying no control characters.
 * @param value The value to check
 * @param argName The argument name (for error messages)
 * @returns The value, unchanged
 * @throws Error if the value is not a string or contains control characters
 */
export function assertNoControlCharacters(value: unknown, argName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Argument '${argName}' must be a string, got ${typeof value}`);
  }
  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    throw new Error(`Invalid characters in argument '${argName}': control characters are not allowed.`);
  }
  return value;
}

/**
 * Assert that a caller-supplied token is one of the values the CLI declares, so
 * an unknown token is named precisely instead of reaching argv and failing
 * opaquely in yargs.
 * @param value The value to check
 * @param choices The allowed values (the CLI's own declared choices)
 * @param argName The argument name (for error messages)
 * @returns The value, narrowed to the allowed union
 * @throws Error if the value is not one of the choices
 */
export function assertOneOf<T extends string>(value: unknown, choices: readonly T[], argName: string): T {
  if (!choices.includes(value as T)) {
    throw new Error(
      `Argument '${argName}' must be one of: ${choices.join(', ')}. Received: "${String(value)}".`
    );
  }
  return value as T;
}

/**
 * Screen the named free-text arguments for control characters and return a copy
 * of `args` with each replaced by a benign placeholder, ready to hand to the base
 * validator without its shell-metacharacter check rejecting ordinary prose.
 * @param args The command arguments
 * @param argNames The free-text argument names to screen
 * @returns A copy of args with the screened values replaced by a placeholder
 * @throws Error if any screened value is not a string or contains control characters
 */
export function screenFreeTextArgs(
  args: Record<string, unknown>,
  argNames: readonly string[]
): Record<string, unknown> {
  let screened = args;
  for (const argName of argNames) {
    const value = args[argName];
    if (value === undefined || value === null) {
      continue;
    }
    assertNoControlCharacters(value, argName);
    screened = { ...screened, [argName]: PLACEHOLDER };
  }
  return screened;
}

/**
 * Screen a `--select` path argument against the SDK's path grammar and return a
 * copy of `args` with it replaced by a benign placeholder. Bracket subscripts are
 * legitimate here even though the base sanitizer rejects brackets.
 * @param args The command arguments
 * @param argName The select argument name
 * @returns A copy of args with the select value replaced by a placeholder
 * @throws Error if the value is not a string or is not a valid path
 */
export function screenSelectPathArg(
  args: Record<string, unknown>,
  argName = 'select'
): Record<string, unknown> {
  const value = args[argName];
  if (value === undefined || value === null) {
    return args;
  }
  if (typeof value !== 'string') {
    throw new Error(`Argument '${argName}' must be a string, got ${typeof value}`);
  }
  if (!SELECT_PATH_PATTERN.test(value)) {
    throw new Error(
      `Argument '${argName}' must be a dot/bracket path such as "records[0].sys_id" — ` +
      'property names separated by ".", each optionally subscripted with "[<index>]". ' +
      `Received: "${value}".`
    );
  }
  return { ...args, [argName]: PLACEHOLDER };
}

/** Output formats declared by the SDK CLI commands that emit a machine envelope. */
export const CLI_OUTPUT_FORMATS = ['json', 'raw'] as const;
