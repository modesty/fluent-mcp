# Upgrade Plan: @servicenow/sdk 4.6.0 → 4.7.1

**Status:** ✅ Complete — all phases landed; 274 tests / 26 suites green, build + lint clean
**Owner:** modesty
**Date drafted:** 2026-05-30
**Release notes reference:** https://github.com/ServiceNow/sdk/releases/tag/v4.7.0 (4.7.1 = latest patch, npm `latest`)
**Working branch:** `feat/upgrade-sdk-4.7.1`

## Progress snapshot

| Phase | Status | Outcome |
|---|---|---|
| 0 — Branch & baseline | ✅ Complete | 247 tests / 24 suites green on 4.6.0 baseline; build clean |
| 1 — Bump deps + mine package | ✅ Complete | SDK→4.7.1, MCP SDK→1.29.0, zod→4.4.x, zod-to-json-schema→3.25.2; build/tests/lint green; docs mined (findings below) |
| 2 — New `data-policy` type + resources | ✅ Complete | DATA_POLICY enum + spec/instruct/2 snippets; spec type-checks, snippets compile via `now-sdk build` |
| 3 — Update existing resources | ✅ Complete | Flow (stages/tryCatch/doInParallel/append), Table augments, AI Agent, NASK, `$override`, `protectionPolicy`; new flow+table snippets compile; filled atf-form-sp instruct gap; 58 specs / 59 instructs validate clean |
| 4 — CLI tool wrappers | ✅ Complete | transform `--table`/`--id` (removed dead `preview`); init `typescript.vue` template; auth client_credentials = env passthrough (no code); timeouts left as-is |
| 5 — Focused MCP improvements | ✅ Complete | outputSchema + structuredContent on get-api-spec/get-snippet/get-instruct/check_auth_status; progress heartbeats for long-running commands |
| 6 — sdk470 tests | ✅ Complete | New `sdk470-types.integration.test.ts` (20 tests) + `structuredContent.test.ts` (7 tests); +27 tests, all green |
| 7 — Docs / version bump | ✅ Complete | README (counts 57→58, What's-new-4.7.x, CI/CD env vars), CLAUDE.md, AGENTS.md pointer |

## Context

fluent-mcp currently targets `@servicenow/sdk` **4.6.0**. ServiceNow shipped **4.7.0** (patch **4.7.1**, now npm `latest`). The MCP server must stay in lockstep with the SDK so the specs, snippets, instructions, tool wrappers, and docs it exposes reflect what the SDK can actually do.

**Target:** `@servicenow/sdk` **4.7.1**.

### What 4.7.x adds (from v4.7.0 release notes; exact names verified against installed package in Phase 1)
- **New API / metadata type: `DataPolicy`** (`sys_data_policy2`), from `@servicenow/sdk/core` — rule-level conditions + field-level enforcement. The one genuinely new metadata type.
- **Flow**: Flow Stages (diagnostics), `TryCatch`, `DoInParallel`, `AppendToFlowVariables`, action-output & error evaluation.
- **Table**: `augment`, `createAccessControls`, `userRole`.
- **AI Agent (AIAF)**: `roleList` optional, `roleMap`, `agentDescriptor`.
- **NASK**: `roleMap`, `roleRestrictions`.
- **Cross-cutting**: `$override` (universal field override) and `protectionPolicy` (on all `sys_policy`-backed APIs).
- **CLI**: transform by table, faster startup, OAuth `client_credentials` for CI/CD, `init` in current directory.
- **Bug fixes**: `lookUpRecord` naming, `sys_dictionary` active, calculated/reference qualifiers, Column `readOnly`, Windows CR escaping, ScheduledScript weekly frequency, transform output for ACL/ScriptInclude/Test.

### Decisions (confirmed with user)
- Target **4.7.1** (latest patch).
- MCP-spec improvements: **focused / high-value only** — output schemas + `structuredContent` for read-only tools, progress notifications for long ops. No pagination/prompt-arg-validation/`_meta` refactors this round.
- Spec authoring: **install 4.7.1 first, mine package `docs/api` + `docs/guides` + `explain` output**.

Phases execute sequentially with verification at each boundary.

## Dependency refresh & version bump (post-upgrade follow-up)
- Bumped all outdated devDeps to latest: `eslint` 10.4.1, `@rollup/plugin-commonjs` 29.0.3, `@types/node` 25.9.1, `@typescript-eslint/*` 8.60.0, `jest` 30.4.2, `rollup` 4.60.4, `ts-jest` 29.4.11.
- **TypeScript held at `~5.9.3` (latest 5.x); 6.0.3 deferred.** TS 6 is not a drop-in here — it stops auto-resolving `@types/node` with the current tsconfig (errors on `process`/`console`/`node:*`/`import.meta.url`), and `bundler`/`nodenext` resolution both destabilize type loading. A proper TS 6 migration (types/lib/`import.meta` config) is a separate, deliberate effort. `@rollup/plugin-typescript` masks these as warnings, so the upgrade would silently ship broken type-checking.
- Package version **0.2.0 → 0.3.0** (feature release: new metadata type, new CLI flags, MCP structuredContent/progress).
- README polished: counts (58 types / 275+ resources), SDK 4.7.1 throughout, condensed older changelog, removed obsolete explain-scaffold note, dropped stale elicitation protocol-date label.

## Phase 1 — Bump dependencies & mine the new package
- `package.json`: `@servicenow/sdk` 4.6.0→4.7.1; `@modelcontextprotocol/sdk` 1.27.1→1.29.0; `zod` ^4.3.6→^4.4.3; `zod-to-json-schema` ^3.25.1→^3.25.2. Conservative devDep bumps only if test/lint stay green.
- `npm install`, `npm run build`, smoke test (`npm run inspect`).
- Mine `node_modules/@servicenow/sdk/docs/`: `datapolicy-api.md` (new), `table-api.md`+`table-guide.md`, `wfa-flow-guide.md`+`wfa-flow-actions-guide.md`, `building-ai-agents-guide.md`, `nowassist-skills-guide.md`; grep `dist/core/index.d.ts` for `$override`/`protectionPolicy`. Cross-check with `npx now-sdk explain <Topic>` + `explain --list`.
- Verify exact CLI flag names (transform tables, init current-dir, auth client_credentials env vars) from CLI help.
- Record findings below before writing resources.

### Phase 1 findings (verified against installed 4.7.1 docs/api + dist/*.d.ts)
- **Deps installed**: SDK 4.7.1, MCP SDK 1.29.0, zod 4.4.x, zod-to-json-schema 3.25.2. Build + 247 tests + lint all green on the bump alone (no MCP handler-signature breakage from 1.27→1.29).
- **`DataPolicy`** (`@servicenow/sdk/core`, `sys_data_policy2`) — full signature in `docs/api/datapolicy-api.md`. Props: `$id`(req), `table`(req `keyof Tables`), `active`, `applyToImportSets`, `applyToSOAP`, `conditions`, `description`, `inherit`, `modelId`, `reverseIfFalse`, `rules` (`Record<field, {$id, mandatory?: boolean|'ignore', readOnly?: boolean|'ignore'}>`, dot-walk keys allowed), `shortDescription`, `useAsUiPolicyOnClient`. `mandatory`/`readOnly` default `'ignore'`.
- **Flow logic** (`@servicenow/sdk/automation`, `docs/guides/wfa-flow-logic-guide.md`, `wfa-flow-stages-guide.md`, `docs/api/flow/`): `wfa.flowLogic.tryCatch(params, { try, catch })`; `wfa.flowLogic.doInParallel(params, ...blocks)`; `wfa.flowLogic.appendToFlowVariables(params, variables, values)`; `FlowStage({ label, value, duration?, alwaysShow?, states? })` declared in `Flow({ stages: {...} })`, activated via `wfa.stage(params.stages.<key>)`.
- **Table augments** (`docs/guides/table-augments-guide.md`, `docs/api/table/table-api.md`): `Table({ augments: 'incident', schema: {...} })` — only `augments`+`schema` allowed together (TS enforces); produces `sys_dictionary` rows, no `sys_db_object`; columns must be scoped (`x_`). **CORRECTION:** the release note's `createAccessControls`/`userRole` are NOT `Table()` API props in shipped 4.7.1 — `userRole` is a `now.config` `accessControls` property ("Role required for end users to access the application and its tables", `docs/configuration/now-config-reference.md`) and `createAccessControls` does not appear in the public API. Phase 3 Table work = `augment` only; do not claim those two on `Table()`.
- **AiAgent** (`docs/api/aiagent-api.md`): `agentDescriptor?: 'require_caller_id'|'created_by_ai_agent_advisor'|'created_by_build_agent'|''`; role config under `dataAccess.roleMap` (role names) / `dataAccess.roleList` (sys_ids) — at least one non-empty when `runAsUser` unset.
- **NASK** (`docs/api/nowassistskillconfig-api.md`): `securityControls.roleRestrictions?` (sys_ids, legacy `role_list`) and `securityControls.roleMap?` (role names, `sys_agent_access_role_mapping`) — both typed `(string|Role|DbRecord<'sys_user_role'>)[]`; at least one required.
- **`$override`** (`docs/fluent/override-guide.md`): flat object of DB column name (snake_case) → `string|boolean|number`, on Fluent constructors; escape hatch, no type checking. (Release note's "Universal Field Override" — confirmed.)
- **`protectionPolicy`** (`'read' | ''`): on APIs backed by `sys_policy` (Action/Subflow/BusinessRule/ScriptInclude/etc.); `'read'` = read-protected body.
- **Validators available**: `npm run validate:specs` (tsc type-checks every spec against installed SDK), `validate:instructs`, `validate:snippets` — use to verify new/edited resources.

## Phase 2 — New metadata type `data-policy`
- `src/types.ts`: add `DATA_POLICY = 'data-policy'` (57→58).
- `res/spec/fluent_spec_data-policy.md`, `res/instruct/fluent_instruct_data-policy.md`, `res/snippet/fluent_snippet_data-policy_0001.md` (+0002 if warranted).
- No wiring beyond enum (auto-discovery via `ResourceLoader`/`ResourceManager`).

## Phase 3 — Update existing resources for 4.7.x
- Flow spec/instruct/snippets: Stages, TryCatch, DoInParallel, AppendToFlowVariables, action-output/error eval (+ new snippet).
- Table spec/instruct: `augment` mode only (+ augment snippet). (createAccessControls/userRole are not Table API props — see Phase 1 correction.)
- AI Agent spec: roleList optional, roleMap, agentDescriptor.
- NASK spec: roleMap, roleRestrictions.
- `$override`: document in `res/prompt/coding_in_fluent.md` ("SDK v4.7.x capabilities"), mention in table/business-rule specs.
- `protectionPolicy`: note in `sys_policy`-backed specs (acl, business-rule, ui-policy…).
- Bump version markers v4.6.0→v4.7.1 in touched files.
- Fill gap: add `res/instruct/fluent_instruct_atf-form-sp.md`.

## Phase 4 — CLI tool wrappers — DONE (verified against installed 4.7.1 CLI help)
- **transform** (`transformCommand.ts`): real new flags are `--table` (comma-separated table names, transform by hierarchy) and `--id` (specific record, used with `--table`). Added `table`+`id` args/flag-map. **Removed `preview`** — `--preview` no longer exists in the 4.7.1 transform CLI (yargs silently ignores it). `--format` (auto-format, default true) left as default behavior, not exposed.
- **init** (`initCommand.ts` + `init/types.ts`): added new template **`typescript.vue`** to `VALID_TEMPLATES` (propagates to elicitator z.enum + elicitation schema) and the tool description. "Init in current directory" needs no wrapper change — the MCP wrapper already runs init inside a resolved working directory.
- **auth**: OAuth `client_credentials` is **env-var driven**, read directly by the SDK CLI — NOT a `--type` choice (CLI `--type` still only accepts `basic`|`oauth`). CI vars: `SN_SDK_NODE_ENV=SN_SDK_CI_INSTALL`, `SN_SDK_AUTH_TYPE` (`basic`|`oauth`), `SN_SDK_INSTANCE_URL`, basic→`SN_SDK_USER`/`SN_SDK_USER_PWD`, oauth→`SN_SDK_OAUTH_CLIENT_ID`/`SN_SDK_OAUTH_CLIENT_SECRET` (ref `docs/configuration/ci-integration.md`). `NodeProcessRunner` already inherits full `process.env` (processRunner.ts:28), so these flow through to spawned commands with **no code change** — document in Phase 7.
- **timeouts**: left as-is. Faster 4.7.x startup means existing explain(15s)/sdkInfo(10s) timeouts have more headroom; lowering would only add CI flakiness risk for no benefit.

## Phase 5 — Focused MCP improvements
- Output schemas + `structuredContent` for read tools (`get-api-spec`, `get-snippet`, `get-instruct`, `check_auth_status`); keep text `content` for back-compat. (explain/sdk_info left as free-form CLI passthroughs.)
- Progress notifications for build/install/transform/download (commands with `timeoutMs >= 30s`) when the client supplies a `progressToken` — best-effort heartbeats via `extra.sendNotification`, never breaks the tool.
- **Key implementation detail:** the server uses a **custom `ListToolsRequestSchema` handler** (`fluentMCPServer.ts`) → `CommandRegistry.toMCPTools()`, which is the source of truth for `tools/list` and overrides `registerTool`'s serialization. `outputSchema` therefore had to be emitted in `toMCPTools()` too — converted via zod v4's native `z.toJSONSchema(z.object(shape))` (the v3 `zod-to-json-schema` package mis-converts zod v4 and omits `type: 'object'`, which the MCP client rejects). `registerTool` also gets `z.object(shape)` so the SDK validates `structuredContent` at call time. Verified end-to-end over stdio with a real MCP client.
- MCP SDK 1.27→1.29: no handler-signature changes needed.

## Phase 6 — Tests
- New `test/sdk470-types.integration.test.ts` (mirror sdk460): DATA_POLICY enum; data-policy spec/instruct/snippet exist; enhanced specs contain 4.7.x terms (tryCatch/doInParallel/appendToFlowVariables, augment/createAccessControls, roleMap/agentDescriptor, roleRestrictions, $override).
- Update tests for changed transform/init args + structuredContent output.
- Unit tests for output schemas + progress emission.
- Keep sdk440/450/460 baselines. `npm test` + `npm run lint` green.

## Phase 7 — Documentation
- README.md: version 4.6.0→4.7.1, count 57→58 + add data-policy, "What's new in 4.7.x", tool-table updates, resource count.
- CLAUDE.md: version, count + data-policy, "New in SDK v4.7.0" note, transform/init/auth descriptions, plan-doc pointer.
- AGENTS.md: stale at v4.5.0 → bring to 4.7.1 or note for removal.
- Finalize this doc's phase-status table.

## Verification (end-to-end)
1. build clean; `npm test` green incl. sdk470; lint clean.
2. `npm run inspect`: tools list; `sdk_info` shows 4.7.1; `explain_fluent_api topic=DataPolicy`; `get-api-spec data-policy`; `get-snippet data-policy`.
3. `sn-spec://data-policy`, `sn-instruct://data-policy`, `sn-snippet://data-policy/0001` resolve.
4. Read tools return `structuredContent`; long op with `progressToken` emits `notifications/progress`.
5. Count = 58 across types.ts, README, CLAUDE.md.
6. `explain` output matches authored DataPolicy/Flow/Table specs.

## Risks & mitigations
- Provisional CLI flag names → verify against installed 4.7.1 before coding.
- MCP SDK 1.27→1.29 drift → review changelog Phase 1.
- structuredContent back-compat → always keep text content.
- Dependency bumps → bump conservatively, re-test/lint after each.

## Out of scope
- Comprehensive MCP refactors (pagination, prompt-arg validation, `_meta` caching).
- Net-new tools beyond existing CLI wrappers.
- Rewriting unaffected specs/snippets.
