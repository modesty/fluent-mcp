import { CommandArgument } from '../../utils/types.js';
import { POSITIVE_INTEGER_DOMAIN } from './argValidation.js';

/**
 * Headroom the runner leaves past a caller-raised CLI wait (the download idle
 * timeout, the exec `--timeout`), so the CLI reports its own timeout rather
 * than the runner cutting it off.
 */
export const CLI_REPORT_HEADROOM_MS = 60_000;

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
  domain: POSITIVE_INTEGER_DOMAIN,
  description:
    'Seconds the CLI waits between response chunks of a full-application download from the instance before giving up (SDK v4.13.0+, CLI default 3600). An idle timeout, not a total. Raising it also extends this tool\'s own process timeout.',
};

/**
 * The runner timeout for a call with a caller-supplied millisecond wait
 * (`pollTimeout`, `exec` `timeoutMs`): the static budget, extended past the
 * CLI wait by `CLI_REPORT_HEADROOM_MS` so the CLI reports its own timeout first.
 */
export function runnerTimeoutForWaitMs(baseMs: number, waitMs: unknown): number {
  return typeof waitMs === 'number'
    ? Math.max(baseMs, waitMs + CLI_REPORT_HEADROOM_MS)
    : baseMs;
}

/**
 * The runner timeout for a call that may carry `timeoutSeconds`: the command's
 * static budget, extended when the caller asked the CLI to wait longer.
 * @param baseMs The command's static timeoutMs
 * @param timeoutSeconds The caller's CLI idle timeout, if any
 * @returns The larger of the two budgets, in milliseconds
 */
export function runnerTimeoutForResponseTimeout(baseMs: number, timeoutSeconds: unknown): number {
  return runnerTimeoutForWaitMs(baseMs, typeof timeoutSeconds === 'number' ? timeoutSeconds * 1000 : undefined);
}
