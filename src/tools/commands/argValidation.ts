import type { ArgumentDomain } from '../../utils/types.js';

/**
 * Argument rules shared by several commands. Required arguments, types, closed
 * choices, grammars, and the control-character rule are declared on each
 * `CommandArgument` and enforced by its input schema (`src/tools/toolSchema.ts`);
 * what remains here is the shared domains and the numeric check the schema does
 * not express.
 */

/**
 * The path grammar the SDK's `--select` extractor accepts (`@servicenow/sdk-cli`
 * `util/json-select.ts`): dot-separated property names, each optionally
 * subscripted with a non-negative integer — e.g. `records[0].sys_id`.
 */
export const SELECT_PATH_DOMAIN: ArgumentDomain = {
  kind: 'pattern',
  regex: /^[A-Za-z0-9_$-]+(?:\[\d+\])*(?:\.[A-Za-z0-9_$-]+(?:\[\d+\])*)*$/,
  expected: 'a dot/bracket path such as "records[0].sys_id" — property names separated by ".", ' +
    'each optionally subscripted with "[<index>]"',
};

/**
 * Assert that a numeric argument is a positive integer. The schema only proves
 * the value is a number; counts and durations the CLI forwards to an HTTP client
 * (a page limit, a seconds-based idle timeout) must also be whole and greater
 * than zero — undici treats `0` as "no timeout at all".
 * @param value The value to check
 * @param argName The argument name (for error messages)
 * @returns The value, narrowed to number
 * @throws Error if the value is not a positive integer
 */
export function assertPositiveInteger(value: unknown, argName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Argument '${argName}' must be a positive integer. Received: ${String(value)}.`);
  }
  return value;
}

/** Output formats declared by the SDK CLI commands that emit a machine envelope. */
export const CLI_OUTPUT_FORMATS = ['json', 'raw'] as const;
