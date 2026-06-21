# Upgrade Plan: @servicenow/sdk 4.7.1 → 4.8.0

**Status:** ✅ Complete — all phases landed; 322 tests / 32 suites green, build + lint clean, 64 specs + 65 instructs validate, 0 unexpected snippet failures
**Owner:** modesty
**Date drafted:** 2026-06-20
**Release notes reference:** https://github.com/ServiceNow/sdk/releases/tag/v4.8.0 (4.8.0 published under npm `next`; `latest` was 4.7.2)
**Working branch:** `feat/upgrade-sdk-4.8.0`

## Progress snapshot

| Phase | Status | Outcome |
|---|---|---|
| 1 — Bump SDK + mine package | ✅ Complete | SDK 4.7.1→4.8.0 (`--save-exact`); build + 291 baseline tests + lint green on the bump alone; package mined (findings below) |
| 2 — New metadata types + resources | ✅ Complete | 6 new types (playbook, rest-message, alias, alias-template, retry-policy, data-lookup), enum 58→64, each with spec + instruct + snippet(s); validator globals updated |
| 3 — Update existing resources | ✅ Complete | coding_in_fluent "SDK v4.8.0 capabilities"; acl field typing + `$meta`; user-preference `$override` + `$meta`; table `accessibleFrom` default note; scheduled-script intentionally untouched |
| 4 — `query` CLI wrapper | ✅ Complete | `query_fluent_records` tool wrapping `now-sdk query`; safe encoded-query handling; registered in CommandFactory |
| 5 — Validate resources | ✅ Complete | 64/64 specs type-check, 65/65 instructs clean, full snippet run = 0 unexpected failures |
| 6 — Tests | ✅ Complete | `sdk480-types.integration.test.ts` (28) + `queryCommand.test.ts` (7); +31 tests; fixed ai-agent-workflow snippet for 4.8.0 |
| 7 — Docs / version bump | ✅ Complete | README, CLAUDE.md, AGENTS.md, this plan; package 0.3.0→0.4.0 |

## Context

fluent-mcp tracked `@servicenow/sdk` **4.7.1**. ServiceNow shipped **4.8.0** (npm `next` at time of upgrade; `latest` was 4.7.2). The MCP server stays in lockstep with the SDK so its specs, snippets, instructions, tool wrappers, and docs reflect what the SDK can actually do.

**Directive:** the **locally-installed 4.8.0 package is the source of truth** wherever it diverges from the release note.

## Phase 1 findings (verified against installed 4.8.0 docs/api + docs/guides + docs/fluent)

New typed APIs (import path verified from each `docs/api/*.md`):
- **PlaybookDefinition** — `@servicenow/sdk/automation` (NOT `/core`), `sys_pd_process_definition`. 3-arg DSL `PlaybookDefinition(config, triggers, body)`; lanes/activities via `wfa.playbook.lane`/`.activity`, triggers via `wfa.playbook.trigger`, ordering via `wfa.playbook.run.Immediately()/After(...)`, data via `wfa.playbook.dataPill(...)`. `body.lanes` MUST be a callback; `triggers` array required even when empty.
- **RestMessage** — `@servicenow/sdk/core`, `sys_rest_message` (+ `sys_rest_message_fn`/headers/parameters/param_defs). Functions with `${var}` substitution; auth via `basicAuthProfile`/`oauthProfile`.
- **Alias** — `@servicenow/sdk/core`, `sys_alias`. `type` connection|credential; reference fields (`retryPolicy`, `configurationTemplate`, `parent`) accept sys_id | Record | nested Fluent call.
- **AliasTemplate** — `@servicenow/sdk/core`, `sys_alias_templates`. `dynamicDataSchema` (discriminated-union fields) + `defaultDataTemplate` + optional pre/on/post scripts + testAction.
- **RetryPolicy** — `@servicenow/sdk/core`, `sys_retry_policy`. Discriminated union over `retryStrategy`; `retry_after` requires `maxElapsedTime` (≤86400), forbids `count`/`interval`, HTTP-only.
- **DataLookup** — `@servicenow/sdk/core`, `dl_definition` (+ rel_match/rel_set). Matcher table must extend `dl_matcher`, same scope; seed rows need `active=true`; `runOnUpdate` defaults `false`.

Cross-cutting / type enhancements:
- **`Now.del()`** (`docs/fluent/now-del-guide.md`) — top-level declarative deletion by coalesce keys or sys_id.
- **`$meta.installMethod`** (`'first install'|'demo'|'once'`) on `Record`, `Acl`, `Alias`, `UserPreference`.
- **`$override`** added to `DataPolicy` & `UserPreference` (same flat escape-hatch shape).
- **ACL `field`**: `keyof FullSchema<T> | SystemColumns | '*'`.
- **Table `accessibleFrom`** defaults to `'public'`.

New CLI: **`now-sdk query <table>`** — read-only Table REST query; `-q` encoded query required, `--limit/--offset/--fields/--display-value/--view/--query-category/--no-count/--query-no-domain/--timeout/-a/-o json`.

### Corrections to the release note (installed package = source of truth)
- Release note says `$override` gives "merge-mode control" on DataPolicy/UserPreference — installed docs show `$override` is the generic column-name→value escape hatch (no merge semantics); it IS present on both APIs.
- Release note says `ScheduledScript` accepts `$meta` (`installMethod: 'once'`) — `scheduledscript-api.md` has **no `$meta`**. `$meta.installMethod` lives on Record/Acl/Alias/UserPreference. ScheduledScript spec left unchanged.
- Release note says ACL `field` accepts `string` — actual type is `keyof FullSchema<T> | SystemColumns | '*'` (typed field names + wildcard, not open string).
- `usercriteria` has an api/guide doc but **no dedicated constructor** (authored via `Record({ table: 'user_criteria' })`) and is not new in 4.8.0 → not added as a metadata type.

## Phase 4 — `query` wrapper design note
The encoded query commonly contains `<`, `>`, `^`. The process runner uses `shell: true`, so bare relational operators would be interpreted as redirections. `QueryCommand` validates the query to exclude single-quote/backslash/control characters, then single-quote-wraps it so the shell treats it as one literal token (POSIX). Simple identifier args (table, fields, view, …) keep the base shell-metacharacter sanitizer. `--exclude-reference-link` is faithfully toggled via yargs's `--no-` negation. Output defaults to the `json` envelope. The global runner's `shell: true` was deliberately left unchanged (re-architecting it risks the Windows `npx` fallback).

## Dependency refresh
- devDeps bumped within-major: `@types/node` 25.9.4, `@typescript-eslint/eslint-plugin` 8.61.1, `@typescript-eslint/parser` 8.61.1, `eslint` 10.5.0, `rollup` 4.62.2.
- **TypeScript held at `~5.9.3`** (6.0.3 not a drop-in — see 4.7.1 plan). **`@types/node` held at 25.x** (26.0 is a new major).
- Package version **0.3.0 → 0.4.0** (feature release: 6 new metadata types, new `query_fluent_records` tool).

## Verification (end-to-end)
1. build clean; `npm test` = 322/322 green incl. sdk480 + queryCommand; `npm run lint` clean.
2. `npm run validate:specs` = 64 clean / 0 errors; `validate:instructs` = 65 clean; `validate:snippets` = 0 unexpected failures (82 pass / 75 xfail / 10 skip).
3. New snippets compile via `now-sdk build`; ai-agent-workflow snippet fixed for 4.8.0's stricter `dataAccess` (roleMap role names).

## Out of scope
- TypeScript 6 / `@types/node` 26 migrations.
- `usercriteria` as a dedicated type (no constructor; not new).
- Re-architecting the process runner's `shell: true` behavior.
- Net-new MCP tools beyond the `query` CLI wrapper.
