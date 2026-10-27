/**
 * `select` for the SDK CLI's machine-mode envelopes, applied by the tools rather
 * than the CLI.
 *
 * The CLI applies `--select` to failure envelopes too (`@servicenow/sdk-cli`
 * `util/json-select.js` `printMachineEnvelope`), so a failed call printed only the
 * selected value, usually `null`, and its reason was lost. For `exec` that also hid
 * whether the script ran at all. The tools therefore never forward `--select`: they
 * request the full JSON envelope and apply the path here, to a successful
 * (`ok: true`) result only. A failure keeps its full envelope.
 *
 * An envelope cut by the runner's output cap cannot be parsed, so these commands
 * capture stdout with `ENVELOPE_RUN_OPTIONS` and bound the shaped result to the
 * normal size only afterwards (`shapeEnvelopeResult`).
 */

import { CommandResult, ProcessRunOptions } from './types.js';
import { boundText, ENVELOPE_CAPTURE_CHARS } from './boundedOutput.js';
import { parseCliEnvelope } from './cliEnvelope.js';

/** Process options for a command whose stdout is a JSON envelope to be read whole. */
export const ENVELOPE_RUN_OPTIONS: ProcessRunOptions = { maxStdoutChars: ENVELOPE_CAPTURE_CHARS };

/** The CLI's path tokens: property names and numeric subscripts (`records[0].sys_id`). */
const PATH_TOKEN_REGEX = /[^.[\]]+|\[\d+\]/g;

/**
 * Resolve a dot/bracket path against a JSON value, exactly as the CLI's
 * `resolveJsonPath` does; an unresolvable path yields undefined.
 */
export function resolveJsonPath(value: unknown, path: string): unknown {
  let current = value;
  for (const token of path.match(PATH_TOKEN_REGEX) ?? []) {
    if (current === undefined || current === null) return undefined;
    if (token.startsWith('[')) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(token.slice(1, -1))];
    } else {
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[token];
    }
  }
  return current;
}

/**
 * Format a selected value as the CLI prints it: compact JSON (`undefined` as
 * `null`), or with `raw`, strings unquoted and `undefined` as empty.
 */
export function formatSelectedValue(value: unknown, raw: boolean): string {
  if (raw) {
    if (value === undefined) return '';
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  return JSON.stringify(value ?? null);
}

/**
 * Replace a successful command's envelope output with the value at `select`.
 * The result is returned unchanged when no path is given, the command failed,
 * or the output is not an `ok: true` envelope, so a failure is always reported
 * with its full envelope. An envelope the runner cut is reported as such
 * instead of being returned as broken JSON.
 * @param result The command result whose output is the CLI's JSON envelope
 * @param select The dot/bracket path, if the caller supplied one
 * @param raw Print a selected string unquoted (the CLI's `--output raw`)
 */
export function applySelect(result: CommandResult, select: unknown, raw = false): CommandResult {
  if (typeof select !== 'string' || select === '' || !result.success) return result;
  if (result.outputTruncated) {
    return {
      ...result,
      output:
        `Output exceeded ${ENVELOPE_CAPTURE_CHARS.toLocaleString('en-US')} characters and was cut, ` +
        `so select "${select}" was not applied. Narrow what the command returns (for a query: fields, limit).`,
    };
  }
  const envelope = parseCliEnvelope(result.output);
  if (envelope?.ok !== true) return result;
  return { ...result, output: formatSelectedValue(resolveJsonPath(envelope, select), raw) };
}

/**
 * Apply `select`, then bound the output and error message to the normal size.
 * Run on a result captured with `ENVELOPE_RUN_OPTIONS`.
 */
export function shapeEnvelopeResult(result: CommandResult, select: unknown, raw = false): CommandResult {
  const selected = applySelect(result, select, raw);
  const output = boundText(selected.output);
  const message = selected.error?.message;
  const boundedMessage = message === undefined ? undefined : boundText(message);
  const error = boundedMessage !== message ? new Error(boundedMessage) : selected.error;
  return output === selected.output && error === selected.error ? selected : { ...selected, output, error };
}
