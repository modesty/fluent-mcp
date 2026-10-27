/**
 * Recovering the failure message of a `now-sdk` child process.
 *
 * The SDK CLI does not report failures on stderr: its logger writes to stdout
 * (`[now-sdk] ERROR: <message>`), and in machine mode (`--output` / `--select`,
 * which `query`, `cicd` and `exec` run in) it silences the logger and prints a
 * JSON envelope `{"ok":false,"error":{"message":…,"status"?:…}}` to stdout
 * instead. Reading only stderr therefore loses the reason for almost every
 * instance-side failure.
 */

import { isRunnerStoppedExit } from './types.js';
import { parseCliEnvelope } from './cliEnvelope.js';

/** CSI sequences (colors, cursor, 24-bit), OSC (title), and charset selectors. */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1B(?:\[[0-9;:]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\)|\([A-B0-2]|[>=])/g;

/** A CLI logger error line; the capture is the message. */
const CLI_ERROR_LINE = /^\[now-sdk\] ERROR:\s*(.+)$/;

/** Strip ANSI escape codes from CLI output so they never reach a client or an LLM. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '');
}

/**
 * The failure message of a machine-mode envelope, if `stdout` is a failed one
 * (`ok: false`). Most commands carry it as `error.message`, kept with a trailing
 * HTTP status when the envelope has one. `exec` reports a script that ran but
 * threw as its result envelope instead, with the messages in `errors` and no
 * `error`.
 */
function envelopeErrorMessage(stdout: string): string | undefined {
  const envelope = parseCliEnvelope(stdout);
  if (envelope?.ok !== false) return undefined;

  const message = envelope.error?.message;
  if (typeof message === 'string' && message.trim() !== '') {
    const status = envelope.error?.status;
    return status !== undefined && !message.includes(String(status)) ? `${message} (status ${String(status)})` : message;
  }
  const errors = Array.isArray(envelope.errors)
    ? envelope.errors.filter((e): e is string => typeof e === 'string' && e.trim() !== '')
    : [];
  return errors.length > 0 ? errors.join('\n') : undefined;
}

/** Messages from `[now-sdk] ERROR:` lines across both streams, in order. */
function loggedErrorMessages(...streams: string[]): string[] {
  return streams
    .flatMap((stream) => stream.split(/\r?\n/))
    .map((line) => CLI_ERROR_LINE.exec(line.trim())?.[1]?.trim())
    .filter((message): message is string => !!message);
}

/**
 * The best available failure message of a `now-sdk` invocation, or undefined
 * when neither stream carries one. Preference: the machine-mode envelope's
 * `error.message`, then the CLI's logged `ERROR:` lines, then raw stderr. When
 * the runner itself stopped the child (timeout / cancellation), its stderr note
 * is always kept, since that is the reason the output is partial.
 * @param stdout The child's stdout
 * @param stderr The child's stderr (the runner appends its own notes here)
 * @param exitCode The exit code reported by the runner
 */
export function cliErrorMessage(stdout: string, stderr: string, exitCode?: number): string | undefined {
  const out = stripAnsi(stdout ?? '');
  const err = stripAnsi(stderr ?? '').trim();

  const fromEnvelope = envelopeErrorMessage(out);
  const fromLog = loggedErrorMessages(out, err).join(' ');
  const primary = fromEnvelope ?? (fromLog || undefined);

  if (isRunnerStoppedExit(exitCode) && err) {
    return primary && !err.includes(primary) ? `${primary}\n${err}` : err;
  }
  return primary ?? (err || undefined);
}
