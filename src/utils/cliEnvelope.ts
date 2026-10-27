/**
 * Reading the SDK CLI's machine-mode JSON envelope from a child's stdout.
 *
 * In machine mode (`--output` / `--select`) the CLI prints one envelope, last, as
 * a single compact JSON line (`util/json-select.js` `printMachineEnvelope`). Log
 * lines can precede it on stdout: `--debug` logs `[now-sdk] DEBUG: Debug logging
 * enabled`, and an inherited `LOG_LEVEL` logs `[now-sdk] Setting log level …`,
 * both before the command silences its logger. So the whole trimmed stdout is
 * tried first, then its last line.
 */

/** A machine-mode envelope: `ok`, then `error` (a run that failed) or `errors` (exec). */
export interface CliEnvelope {
  ok?: unknown;
  error?: { message?: unknown; status?: unknown };
  errors?: unknown;
  [key: string]: unknown;
}

function parseObject(text: string): CliEnvelope | undefined {
  if (!text.startsWith('{')) return undefined;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as CliEnvelope) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The envelope in `stdout`, or undefined when there is none: the whole trimmed
 * text if it is a JSON object, else its last line if that is one.
 */
export function parseCliEnvelope(stdout: string): CliEnvelope | undefined {
  const text = stdout.trim();
  const whole = parseObject(text);
  if (whole) return whole;
  const lastBreak = text.lastIndexOf('\n');
  return lastBreak === -1 ? undefined : parseObject(text.slice(lastBreak + 1).trim());
}
