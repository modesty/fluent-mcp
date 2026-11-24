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
 * time, in **seconds**, the CLI waits between response chunks from the
 * instance. It is undici's `bodyTimeout` on the long-running dispatcher, an
 * idle timeout, not a total; the CLI default is 3600 seconds. Through SDK
 * v4.14.2 only the full-app download (`GET /api/fluent/download/<scope>`) used
 * that dispatcher; since v4.14.3 the connector uses it for every request it
 * makes (`sdk-api` `Connector.fetch`). Named `timeoutSeconds` because
 * `query_fluent_records` already has a `timeout` measured in milliseconds.
 */
export const RESPONSE_TIMEOUT_ARGUMENT: CommandArgument = {
  name: 'timeoutSeconds',
  type: 'number',
  required: false,
  domain: POSITIVE_INTEGER_DOMAIN,
  description:
    'Seconds the CLI waits between response chunks from the instance before giving up (SDK v4.13.0+, CLI default 3600). An idle timeout, not a total. Raising it also extends this tool\'s own process timeout.',
};

/**
 * `now-sdk download` / `transform` / `init` `--connect-timeout` (SDK v4.14.3+):
 * the maximum time, in **seconds**, the CLI waits to open the TCP/TLS
 * connection to the instance (undici `connect.timeout`, or the proxy and
 * tunnel TLS timeouts when `NODE_USE_ENV_PROXY=1`). Omitted, undici's 10 second
 * default applies. The CLI accepts any positive number but checks it only when
 * it builds the long-running connector, after the command has started, so the
 * domain is enforced here; whole seconds keep it consistent with `timeoutSeconds`.
 */
export const CONNECT_TIMEOUT_ARGUMENT: CommandArgument = {
  name: 'connectTimeoutSeconds',
  type: 'number',
  required: false,
  domain: POSITIVE_INTEGER_DOMAIN,
  description:
    'Seconds the CLI waits to open a connection to the instance before giving up (SDK v4.14.3+, CLI default 10). Raise it on a slow network or behind a proxy; the proxy itself is configured in this server\'s environment (NODE_USE_ENV_PROXY=1 with HTTPS_PROXY, HTTP_PROXY, NO_PROXY). Raising it also extends this tool\'s own process timeout.',
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
 * The runner timeout for a call that may carry `timeoutSeconds` and
 * `connectTimeoutSeconds`: the command's static budget, extended when the
 * caller asked the CLI to wait longer. One request can spend both waits (the
 * connect, then the idle gap), so a supplied pair is summed.
 * @param baseMs The command's static timeoutMs
 * @param timeoutSeconds The caller's CLI idle timeout, if any
 * @param connectTimeoutSeconds The caller's CLI connect timeout, if any
 * @returns The larger of the two budgets, in milliseconds
 */
export function runnerTimeoutForResponseTimeout(
  baseMs: number,
  timeoutSeconds: unknown,
  connectTimeoutSeconds?: unknown,
): number {
  const waits = [timeoutSeconds, connectTimeoutSeconds].filter((value): value is number => typeof value === 'number');
  return runnerTimeoutForWaitMs(
    baseMs,
    waits.length > 0 ? waits.reduce((sum, seconds) => sum + seconds, 0) * 1000 : undefined,
  );
}
