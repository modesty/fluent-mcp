import type { ArgumentDomain } from '../../utils/types.js';

/**
 * Argument domains shared by several commands. Required arguments, types,
 * closed choices, grammars, integer bounds, and the control-character rule are
 * declared on each `CommandArgument` and compiled into its input schema
 * (`src/tools/toolSchema.ts`).
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
 * A ServiceNow record sys_id: exactly 32 hexadecimal characters. The SDK
 * interpolates the CI/CD `progressId` and `resultId` into the request path
 * unencoded (`api/sn_cicd/progress/${id}`, `api/sn_cicd/tests/test/results/${id}`),
 * so without this domain `../../../now/table/sys_user` turned a result read into a
 * GET of an arbitrary Table API path (verified on a live instance). The ids sent as
 * query parameters carry it too: each names one record, and anything else is a
 * mistake the instance would only report as "not found".
 */
export const SYS_ID_DOMAIN = {
  kind: 'pattern',
  regex: /^[0-9a-fA-F]{32}$/,
  expected: 'a sys_id: 32 hexadecimal characters',
} as const satisfies ArgumentDomain;

/**
 * A positive whole number (`>= 1`), for counts and timeouts the CLI forwards to
 * an HTTP client (undici treats `0` as "no timeout at all").
 */
export const POSITIVE_INTEGER_DOMAIN: ArgumentDomain = { kind: 'integer', min: 1 };

/** A non-negative whole number (`>= 0`), for zero-based pagination offsets. */
export const NON_NEGATIVE_INTEGER_DOMAIN: ArgumentDomain = { kind: 'integer', min: 0 };

/** Output formats declared by the SDK CLI commands that emit a machine envelope. */
export const CLI_OUTPUT_FORMATS = ['json', 'raw'] as const;
