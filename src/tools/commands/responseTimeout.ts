import { CommandArgument } from '../../utils/types.js';
import { assertPositiveInteger } from './argValidation.js';

/**
 * Headroom the runner leaves past the CLI's own idle timeout, so a stalled
 * download is reported by the CLI rather than cut off by the runner.
 */
const CLI_REPORT_HEADROOM_MS = 60_000;

/**
 * `now-sdk download` / `transform` `--timeout` (SDK v4.13.0+): the maximum
 * time, in **seconds**, the CLI waits between response chunks of the full-app
 * download (`GET /api/fluent/download/<scope>`). It is an idle timeout, not a
 * total — the CLI default is 3600 seconds. Named `timeoutSeconds` because
 * `query_fluent_records` already has a `timeout` measured in milliseconds.
 */
export const RESPONSE_TIMEOUT_ARGUMENT: CommandArgument = {
  name: 'timeoutSeconds',
  type: 'number',
  required: false,
  description:
    'Seconds the CLI waits between response chunks of a full-application download from the instance before giving up (SDK v4.13.0+, CLI default 3600). An idle timeout, not a total. Raising it also extends this tool\'s own process timeout.',
};

/** Reject a `timeoutSeconds` that is present but not a positive integer. */
export function validateResponseTimeout(args: Record<string, unknown>): void {
  if (args.timeoutSeconds !== undefined && args.timeoutSeconds !== null) {
    assertPositiveInteger(args.timeoutSeconds, 'timeoutSeconds');
  }
}

/**
 * The runner timeout for a call that may carry `timeoutSeconds`: the command's
 * static budget, extended when the caller asked the CLI to wait longer.
 * @param baseMs The command's static timeoutMs
 * @param timeoutSeconds The caller's CLI idle timeout, if any
 * @returns The larger of the two budgets, in milliseconds
 */
export function runnerTimeoutForResponseTimeout(baseMs: number, timeoutSeconds: unknown): number {
  if (typeof timeoutSeconds !== 'number') {
    return baseMs;
  }
  return Math.max(baseMs, timeoutSeconds * 1000 + CLI_REPORT_HEADROOM_MS);
}
