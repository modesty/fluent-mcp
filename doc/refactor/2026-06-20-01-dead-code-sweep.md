# Refactor Step 01 — Dead-code sweep (YAGNI)

**Date:** 2026-06-20
**Commit:** `96b4f1b` on `refactor/architecture-loop`
**Intent:** Delete verified dead code. Net **−85 LOC**, zero behavior change.

## What & why

The first rung of the ladder: *does this need to exist at all?* These exports had
zero production callers and zero test references (verified by grep across `src/` and
`test/`), so they were deleted rather than refactored.

| Symbol | File | Evidence |
|---|---|---|
| `McpInvalidParamsError`, `McpUnknownToolError` | `src/utils/mcpErrors.ts` | Never instantiated anywhere |
| `toJsonRpcError()` (base + override) | `src/utils/mcpErrors.ts` | Never called; the MCP SDK serializes thrown errors via their `.code` field |
| `uri` field on `McpResourceNotFoundError` | `src/utils/mcpErrors.ts` | Existed only to feed `toJsonRpcError`; consumers only do `instanceof` + rethrow |
| `validateConfig()` | `src/config.ts` | Never called |
| `ValidTemplate` type | `src/tools/commands/init/types.ts` | `initValidator.ts` re-derives `(typeof VALID_TEMPLATES)[number]` inline instead |
| `getPrimaryRootPathFrom()` | `src/utils/rootContext.ts` | Only a test mock referenced it; logic fully subsumed by `resolveWorkingDirectory(instanceRoots)` |

## Verification (live-tested green)

- `npx tsc --noEmit` → exit 0
- `npm test` → 30 suites, 291 tests pass (unchanged from baseline)

## Gate

Complexity down · no abstraction added · floor above intact · smallest change that
fully removes the dead code.

## Rejected (over-engineering, not done)

The exploration pass proposed data-driving the trivial command classes via a
factory/metadata-table and splitting `fluentMCPServer.ts` / `toolsManager.ts` into
single-caller helper classes. Both *add* abstraction (DRY-by-prediction; one caller =
debt). Not pursued. `LoggingManager` (suggested for deletion) has two real callers and
centralizes lifecycle log vocabulary — kept.

## Candidate next steps (vetted, not yet done)

- `type Root = { uri: string; name?: string }` — the inline shape is repeated many
  times across `rootContext.ts`, `fluentMCPServer.ts`, `loggingManager.ts`. Genuine
  DRY-by-extraction (same shape, same reason to change, seen 3×+). Low risk, touches
  several files.
