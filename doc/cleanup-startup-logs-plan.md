# Plan: Clean up MCP server startup logs

**Date:** 2026-06-01
**Branch (suggested):** `fix/startup-log-cleanup`

## Context

The VS Code MCP client's startup log for `fluent-mcp` is noisy and misleading. Two distinct problems:

1. **INFO logs are mislabeled as warnings, duplicated, and often show as `undefined`.** Every routine INFO line appears twice — once as `[warning] [server stderr] … [INFO]: …` and once as `[info] fluent-mcp: …` — and the `[info]` copy frequently renders as `fluent-mcp: undefined`.
2. **A real error is buried in the noise:** auto-auth runs `npx now-sdk auth --list` / `--add`, which fails with `npm error 404 … now-sdk … Not found`. The SDK CLI is being invoked by the wrong package name in a directory that has no local install.

## Root causes (verified in code)

### Logging
- `Logger.writeLogEntry()` (`src/utils/logger.ts:105`) **always** writes the entry to `process.stderr` **and** sends an MCP `notifications/message`. The VS Code client paints anything on the server's stderr as `[warning]`, so every INFO/DEBUG line shows as a warning — and it's duplicated by the notification copy.
- `Logger.sendMcpNotification()` (`src/utils/logger.ts:132`) builds params as `{ level, logger, message, data }`. The MCP spec for `notifications/message` is `{ level, logger?, data }` — there is **no `message` field**, and `data` is the content. The client renders `data`, which is omitted when a log call has no context object → it prints `fluent-mcp: undefined`. (Lines with context render the context JSON, not the message.)
- `NodeProcessRunner` logs child-process output line-by-line at INFO: `[STDOUT]`/`[STDERR]` (`src/tools/processors/processRunner.ts:111,125`), plus `Spawning child process` (`:43`) and `Process exited` (`:130`). This is what dumps the raw `npm error 404 …` block into the startup log. It should be DEBUG.

### The real error (auth 404)
- `AuthCommand.execute()` (`src/tools/commands/authCommand.ts:84`) builds `['now-sdk', 'auth', …]` and runs `npx now-sdk …`. `sessionAwareCommand.executeSdkCommand()` (`src/tools/commands/sessionAwareCommand.ts:107`) does the same for every SDK command (`['now-sdk', sdkCommand]`).
- `npx now-sdk` only resolves when the **current working directory** has `@servicenow/sdk` installed locally (its bin is named `now-sdk`). Auto-auth runs in the client root (`/Users/.../fluent-assist`), which has no such install, so `npx` tries to fetch a package literally named `now-sdk` from the registry → **404**.
- `InitCommand` already uses the robust form `npx -y @servicenow/sdk init` (`src/tools/commands/initCommand.ts`), and `buildAuthCommand()` even prints the correct `npx @servicenow/sdk auth …` as the manual hint — so the codebase is internally inconsistent.
- fluent-mcp depends on `@servicenow/sdk` 4.7.1, so its bin resolves locally at `node_modules/@servicenow/sdk/bin/index.js` (`node_modules/.bin/now-sdk`) regardless of cwd — the fix can use the bundled copy directly.

### Auto-auth behavior
- `attemptAddAuthProfile()` (`src/server/fluentInstanceAuth.ts:147`) runs `auth --add` at startup **even when no credentials are available**, guaranteeing a failed spawn whose stderr (the npm 404) is logged at INFO and then re-logged as a WARNING with the full npm error blob.

## Plan

### Phase 1 — Logging pipeline (`src/utils/logger.ts`)
1. **Stop double-emitting.** In `writeLogEntry()`, when an MCP server is connected, emit via `notifications/message` only; write to stderr **only** when no MCP server is set yet (pre-connection bootstrap) or when the notification send throws (fallback). Result: post-connection logs flow through the one channel the client renders with the correct severity, so INFO shows as `[info]`, not `[warning]`.
   - Add an opt-in `FLUENT_MCP_LOG_TO_STDERR` env (default off) to also mirror to stderr for headless debugging.
2. **Conform the notification payload to the MCP spec.** Send `{ level, logger, data }` where `data` carries the message: `data = context && Object.keys(context).length ? { message, ...context } : message`. Fixes the `fluent-mcp: undefined` rendering. Apply to both `sendMcpNotification()` and `sendNotification()` (custom logger names).
3. Keep `sendNotification()` (e.g. `authentication`) on the same rules so domain notifications also render their message.

### Phase 2 — Demote verbose child-process logs (`src/tools/processors/processRunner.ts` + `cliExecutor.ts`)
- Change per-chunk `[STDOUT]`/`[STDERR]` passthrough, `Spawning child process`, and `Process exited with code` from `logger.info` to `logger.debug`. Command outcomes are already surfaced via `CommandResult`; raw child output belongs at DEBUG. This removes the npm-error wall from the default (info) log.
- Check `cliExecutor.ts`'s `Executing command:` line and demote to DEBUG as well.

### Phase 3 — Fix the SDK CLI invocation (the real warning)
- Add a single helper (e.g. `resolveSdkCli()` in a shared util) that resolves the bundled SDK CLI: `require.resolve('@servicenow/sdk/bin/index.js')` (via `createRequire(import.meta.url)`), returning `['node', <binPath>]`; fall back to `['npx', '-y', '@servicenow/sdk']` if resolution fails.
- Use it in `AuthCommand.execute()` and `sessionAwareCommand.executeSdkCommand()` in place of the bare `'now-sdk'` token. Align `InitCommand` to the same helper for consistency.
- Rationale: auth is a global operation and must not depend on the cwd being a Fluent project; build/transform/etc. also become robust when invoked outside a project. Version stays pinned to fluent-mcp's bundled 4.7.1.

### Phase 4 — Soften auto-auth startup (`src/server/fluentInstanceAuth.ts`)
- Only attempt `auth --add` when it can succeed non-interactively: for `basic`, require `SN_USER_NAME`/`SN_USERNAME` + `SN_PASSWORD`; for `oauth`, do **not** auto-spawn a browser at startup. Otherwise skip the add and emit a single `NOTICE` with the `actionRequired` command (the existing `not_authenticated` result), no failed spawn.
- On genuine failure, log one concise WARNING (message + exit code), not the full multiline npm error blob (that detail stays at DEBUG via Phase 2).

### Phase 5 — Tests & verification
- Unit: logger emits spec-shaped `data` (message present; no top-level `message` field); no stderr write when an MCP server is set (and writes when not); `sendNotification` payload shape.
- Unit: `processRunner` uses DEBUG for child output (spy on logger).
- Unit: `resolveSdkCli()` returns a `node <path>` pair when the SDK resolves; auth/transform arg builders use it (assert no bare `now-sdk`).
- Unit: auto-auth skips `--add` when basic creds are absent and returns a single `not_authenticated` NOTICE.
- Manual E2E: launch via `npm run inspect` and via a stdio MCP client from a non-Fluent cwd; confirm (a) no `[warning] [server stderr]` for INFO, (b) messages render (no `undefined`), (c) no `npm 404` block, (d) auth status is a single clean NOTICE or success.
- `npm run build`, `npm test`, `npm run lint` green.

## Out of scope
- Changing the log transport beyond stderr/MCP-notification (no file logging changes).
- Reworking how project commands choose SDK version when a project pins a different `@servicenow/sdk` (the helper uses the bundled version; per-project version selection is a separate enhancement).

## Expected after-state (default `info` level)
- `fluent-mcp: <readable message>` lines at `[info]`, one per event, correctly leveled.
- No `[warning] [server stderr]` lines for routine INFO.
- No `npm error 404` wall; auto-auth resolves the bundled SDK and either authenticates or emits one `NOTICE` with the manual command.

---

## Status: COMPLETE (2026-06-01, branch `feat/upgrade-sdk-4.7.1`)

All five phases implemented and verified.

- **Phase 1 — logging pipeline** (`src/utils/logger.ts`): notification-only post-connect; stderr only pre-connect/on send failure; opt-in `FLUENT_MCP_LOG_TO_STDERR`. Payload conformed to MCP spec `{ level, logger, data }` with `data = context?.keys ? { message, ...context } : message` (fixes `undefined`). Applied to `sendMcpNotification` and `sendNotification`.
- **Phase 2 — verbose child logs → DEBUG**: `processRunner.ts` (spawn, `[STDOUT]`, `[STDERR]`, exit) and `cliExecutor.ts` (`Executing command`) demoted from `info` to `debug`.
- **Phase 3 — SDK CLI invocation**: new `src/utils/sdkCli.ts#resolveSdkCli()` resolves the bundled `@servicenow/sdk` bin (`node <bin>`), anchored at `getProjectRootPath()` (the SDK `exports` map blocks `./bin/index.js`, so we resolve `/core` and walk to the package root), with `npx -y @servicenow/sdk` fallback. Applied in `authCommand`, `sessionAwareCommand.executeSdkCommand`, `initCommand`, and `sdkInfoCommand`. No more bare `now-sdk` token.
- **Phase 4 — auto-auth**: `fluentInstanceAuth.ts` only auto-adds when non-interactive (basic + `SN_USER_NAME`/`SN_USERNAME` + `SN_PASSWORD`); oauth/credential-less skip with a single `not_authenticated` NOTICE. Failure WARNING is concise (exit code only; full output stays at DEBUG).
- **Phase 5 — tests & verification**: new `test/utils/logger.test.ts`, `test/utils/sdkCli.test.ts`, `test/tools/processRunner.test.ts`, `test/server/fluentInstanceAuth.test.ts`; global `resolveSdkCli` mock + updated invocation assertions in `setup.js` and command tests. `npm test` = **30 suites / 291 tests green**; `npm run build` + `npm run lint` clean. E2E: bundled CLI runs `auth --list` from `/tmp` (the old 404 cwd) successfully; stdio handshake shows post-connect logs only via `notifications/message` (spec-shaped `data`), stderr limited to the 2 pre-connect bootstrap lines.
