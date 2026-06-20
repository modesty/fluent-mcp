# Refactor Step 02 — Dedupe auth-trigger + drop dead methods

**Date:** 2026-06-20
**Commit:** `dc03e51` on `refactor/architecture-loop`
**Intent:** Re-examine the two large files (`fluentMCPServer.ts` 531 LOC,
`toolsManager.ts` 359 LOC) and act *only* where complexity genuinely drops.
Net **−53 LOC**, zero behavior change.

## Verdict on splitting the big files: NO

Both are cohesive coordinators. Extracting the agent-suggested `RootsManager` /
`ToolRegistrar` / `ProgressNotifier` helper classes would move logic out without
shrinking it and leave each helper with exactly one caller — debt, not design.
Rejected. The real wins were dead code + one genuine duplication.

## Changes

| Change | File | Why |
|---|---|---|
| Extract `triggerAutoAuthOnce(reason)` | `fluentMCPServer.ts` | The 12-line auto-auth block (`if (!autoAuthTriggered) { … autoValidateAuthIfConfigured … }`) was duplicated verbatim in the delayed-init fallback and the `notifications/initialized` handler. Now a single source of truth for a security-relevant action. **Two** real callers, so the method earns its existence. Log strings preserved exactly (`''` and `' after client initialization'`). |
| Delete `removeRoot()` + its test | `fluentMCPServer.ts`, test | No production caller; only its own test exercised it. MCP never calls it. Speculative API. |
| Delete `getCommand`, `getCommandRegistry`, `getExecutorProcessor` | `toolsManager.ts` | Zero production refs, zero test refs. |
| Delete assign-only `cliCmdWriter` field + unused `CommandProcessor` import | `toolsManager.ts` | The field was written in the constructor but never read (the local var is what the factory uses). |

## Verification (live-tested green)

- `npx tsc --noEmit` → exit 0
- `npm test` → 30 suites, 290 tests pass (291→290: removed the dead-method test)

Note: the editor LSP threw many spurious diagnostics mid-edit (lost `@types/node`
/ jest-globals context, stale line numbers). Ground truth was taken from `tsc`
and Jest, both green.

## Gate

Complexity down · the one added method has two callers · no single-caller helper
classes introduced · floor above intact.

## Loop status

Stopping here. The codebase is well-factored; remaining "opportunities" from the
initial scan are either over-engineering (data-driven command factory) or
single-caller extractions that would add debt. Two clean commits delivered:
**−138 LOC total**, no functionality changed.
