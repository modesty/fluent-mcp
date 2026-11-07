import { MAX_TIMER_DELAY_MS } from './types.js';

/**
 * Parsing for the operator command-timeout override
 * (`FLUENT_MCP_COMMAND_TIMEOUT_MS`), a pure helper so the contract — "honor
 * only a positive integer a Node timer can wait for" — is unit-testable on its own.
 */

/**
 * Interpret a raw env-var value as a command-timeout override in milliseconds.
 * @param raw The raw environment value (or undefined when the var is unset).
 * @returns The override in ms when `raw` is a positive integer written in
 *   digits (surrounding whitespace allowed) and at most `MAX_TIMER_DELAY_MS`;
 *   otherwise undefined (unset, empty, zero, negative, a unit suffix, a decimal
 *   or exponent, or longer than a timer can wait), and the per-command /
 *   configured defaults apply.
 */
export function parseCommandTimeoutOverride(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  // Digits only. parseInt read "1e6" as 1 and "1.5" as 1, and this override wins
  // over every per-command timeout, so a typo killed every command after 1 ms.
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  // Above MAX_TIMER_DELAY_MS Node fires the timer after 1 ms: 2147483648 killed
  // every command at once, the same failure as the parseInt typo.
  const parsed = Number(trimmed);
  return parsed > 0 && parsed <= MAX_TIMER_DELAY_MS ? parsed : undefined;
}
