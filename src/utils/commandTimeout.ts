/**
 * Parsing for the operator command-timeout override
 * (`FLUENT_MCP_COMMAND_TIMEOUT_MS`). Kept as a pure helper so the contract —
 * "honor only a positive integer" — is unit-testable without loading `config.ts`
 * (which uses `import.meta` and cannot be recompiled under the test transform).
 */

/**
 * Interpret a raw env-var value as a command-timeout override in milliseconds.
 * @param raw The raw environment value (or undefined when the var is unset).
 * @returns The override in ms when `raw` is a positive integer; otherwise
 *   undefined (unset, empty, non-numeric, zero, or negative — all fall back to
 *   the per-command / configured defaults).
 */
export function parseCommandTimeoutOverride(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
