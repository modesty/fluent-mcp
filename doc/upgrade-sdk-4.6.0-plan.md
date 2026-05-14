# Upgrade Plan: @servicenow/sdk 4.5.0 → 4.6.0

**Status:** In progress — Phases 0, 1, 2, 3, 6a complete; Phase 4 next
**Owner:** modesty
**Date drafted:** 2026-05-13
**Release notes reference:** https://github.com/ServiceNow/sdk/releases/tag/v4.6.0
**Working branch:** `feat/upgrade-sdk-4.6.0`

## Progress snapshot

| Phase | Status | Outcome |
|---|---|---|
| 0 — Branch & baseline | ✅ Complete | 215 tests / 23 suites green on 4.5.0 baseline |
| 1 — Bump to 4.6.0 + smoke | ✅ Complete | Lint/build/tests clean. Smoke surfaced: `explain` no longer needs `--source` (Phase 4 scope shift) |
| 2 — 4 new types + resources | ✅ Complete | 4 enum entries, 16 resource files (specs/instructs/snippets); 215 tests still green |
| 3 — Update existing resources | ✅ Complete | 10 files updated (form, flow, ai-agent, ai-agent-workflow, NASK, table, coding_in_fluent prompt); ScheduledScript deferred (see deferrals) |
| 6a — README.md sync | ✅ Complete (out of order, per user request) | Counts/types/explain flags synced; removed fictional "AI Error Analysis" claim (see deferrals) |
| 4 — ExplainCommand + scaffold delete | ⏭ Next | |
| 5 — sdk460 integration tests | ⏸ Pending | |
| 6 — Docs / version bump | ⏸ Pending | |
| 6b — Snippet validator script | ⏸ Pending | |
| 7 — PR + post-merge verify | ⏸ Pending | |
| Tech-debt #3 follow-up | ⏸ Pending | Deferred |
| ScheduledScript clarification | ⏸ Pending | Deferred (see deferrals) |

## Deferrals (out-of-band items surfaced mid-execution)

1. **ScheduledScript "modules" support contradiction.** Release notes say "ScheduledScript script fields now support modules"; `npx @servicenow/sdk@4.6.0 explain scheduledscript-api --format=raw` says the opposite ("Module imports are not supported (string-only property)"). Resources kept aligned with explain output. Needs SDK-team clarification before content edit. Tracked as a follow-up task.
2. **README "AI-Powered Error Analysis" was fictional.** Env vars `FLUENT_MCP_ENABLE_ERROR_ANALYSIS` / `FLUENT_MCP_MIN_ERROR_LENGTH` are documented but **never read by code**. `SamplingManager` is constructed but never invoked (corroborated by tech-debt #3). The Phase 6a README sync removed the false claims. Tech-debt #3 will resolve the dead `SamplingManager` (wire it up or delete) in a follow-up PR.

---

## 1. Current MCP Implementation Status (audit summary)

### Dependency & version
- `package.json:56` — `"@servicenow/sdk": "4.5.0"`
- Target: `4.6.0`
- No other dependency rev required (MCP SDK 1.27.1, Node ≥ 20.18.0 stay).

### Tools layer (`src/tools/`)
9 MCP tools registered via `CommandFactory.createCommands()`:
`sdk_info`, `init_fluent_app`, `build_fluent_app`, `deploy_fluent_app`, `fluent_transform`, `download_fluent_dependencies`, `download_fluent_app`, `clean_fluent_app`, `pack_fluent_app`, `explain_fluent_api`.

- `--skip-flow-activation` already wired in `installCommand.ts:21-25,37` ✅
- `explain_fluent_api` (`src/tools/commands/explainCommand.ts`) supports only `api`, `source`, `debug`. **Missing v4.6.0 flags**: `--list`, `--peek`, `--format=raw`, tag-based lookup.

### Resources layer (`src/res/`, `res/`)
- Single source of truth for metadata types: `src/types.ts:46-100` (`ServiceNowMetadataType` enum, 52 entries).
- `ResourceLoader` (`src/utils/resourceLoader.ts:35-67`) scans `res/spec/` for `fluent_spec_*.md` and falls back to the enum on failure — **dynamic discovery**, so adding new types is mostly a file-drop task.
- `res/spec/` (52 specs), `res/instruct/` (53 instruct files incl. `fluent_instruct_atf.md` umbrella), `res/snippet/` (144 snippets).

### Prompts layer (`src/prompts/`, `res/prompt/`)
- `PromptManager` (`src/prompts/promptManager.ts:36-54`) auto-discovers any `*.md` under `res/prompt/`.
- Two prompts today: `coding_in_fluent.md`, `create_custom_ui.md`.
- `coding_in_fluent.md` accepts a `metadata_list` argument — already adaptive to new types.

### now.config handling
- `tableDefaultLanguage` / `defaultLanguage`: **not referenced anywhere in `src/`** — only `res/snippet/fluent_snippet_service-portal_0014.md:13` uses `defaultLanguage` for a Service Portal `i18n` setting (unrelated to `now.config`).
- `explainCommand.ts:133-137` writes a minimal scaffold `now.config.json` (only `scope`, `scopeId`, `name`) — no impact from the rename.

### Tests
- `test/sdk450-types.integration.test.ts` — validates v4.5.0 type-set presence (specs/instructs/snippets exist on disk).
- `test/sdk440-types.unit.test.ts` — mocked-FS unit tests for resource loading.
- `test/res/resourceManager.test.ts` — resource registration smoke test.
- New v4.6.0 test file will follow the same pattern.

---

## 2. Delta to Land (v4.5.0 → v4.6.0)

| # | Area | Change | MCP impact |
|---|------|--------|------------|
| A | **New API: InboundEmailAction** | `sysevent_in_email_action` records | New metadata type `inbound-email-action` |
| B | **New API: SPHeaderFooter** | Service Portal | New metadata type `sp-header-footer` |
| C | **New API: SPPageRouteMap** | Service Portal routing | New metadata type `sp-page-route-map` |
| D | **New API: CustomAction** | `sys_hub_action_type_base` | New metadata type `custom-action` |
| E | **Form declarative API** | New capability on existing `Form` | Update existing `form` spec/instruct/snippet |
| F | **Flow / Subflow invocation** | Subflows can call Subflows; Custom Actions usable as flow steps; cross-scope refs via SDK deps | Update `flow` spec/instruct/snippet (no new type) |
| G | **AIAF auto-ACL on build** | ACL generated automatically for `AiAgent` / `AiAgenticWorkflow` | Update `ai-agent` / `ai-agent-workflow` instruct (note + remove manual-ACL guidance) |
| H | **NASK improvements** | Auto-generated default outputs; new input types `glide_record`/`simple_array`/`json_object`/`json_array`; optional `tableName`; optional `truncate` | Update `now-assist-skill-config` spec/instruct/snippet |
| I | **Table — dict override** | `Table` API supports `sys_dictionary_override` directly | Update `table` spec/instruct/snippet |
| J | **ScheduledScript modules** | Script fields support modules | Update `scheduled-script` spec/instruct/snippet |
| K | **`explain` CLI flags + scope** | `--list`, `--peek`, `--format=raw`; topic-by-name-or-tag; now covers **APIs *and* guides**; `--source` and Fluent project no longer required | Extend `ExplainCommand` flags **and delete its scaffold layer** (resolves Debt #1 by elimination) |
| L | **now.config rename** | `tableDefaultLanguage` → `defaultLanguage` (old still works) | No code change needed; add to instruct content if any snippet ever uses it (none today) |
| M | **sys_id conflict detection** | Fluent-vs-Fluent = error; XML-vs-Fluent respects `--errorOnConflict` | Documentation note only |
| N | **Bug fixes** (NASK dupes, SP M2M, flow var types, transform HTML entities, UI Page inline script, etc.) | No MCP code action; verify via post-upgrade smoke tests |

---

## 3. Phased Execution Plan

Per [[feedback_phased_execution]] — stop at each phase boundary, verify, and wait for approval before continuing.

### Phase 0 — Branch & baseline (10 min)
- Cut branch `feat/upgrade-sdk-4.6.0` off `master`.
- Run baseline: `npm test`, `npm run lint`, `npm run build` — capture green-state for diff later.
- **Verify**: all tests pass on 4.5.0 baseline.
- **Gate**: results posted; user approves to continue.

### Phase 1 — Bump dependency & smoke-test (15 min)
- Update `package.json:56` to `"@servicenow/sdk": "4.6.0"`.
- `npm install`, regenerate lockfile.
- `npm run build` and `npm run lint`.
- Run existing test suite — expect 4.5.0 type-set tests still green (no new types added yet).
- `npm run inspect` and manually verify: `sdk_info` returns 4.6.0; `explain_fluent_api` with `api="BusinessRule"` still works against the scaffold.
- **Verify**: build clean; smoke ok.
- **Gate**: approval to add new types.

### Phase 2 — Metadata-type enum + resource files (60–90 min)
Add four new enum entries (alphabetically) in `src/types.ts:46-100`:
- `CUSTOM_ACTION = 'custom-action'`
- `INBOUND_EMAIL_ACTION = 'inbound-email-action'`
- `SP_HEADER_FOOTER = 'sp-header-footer'`
- `SP_PAGE_ROUTE_MAP = 'sp-page-route-map'`

For each of the four new types, create:
- `res/spec/fluent_spec_<type>.md` — API surface from `now-sdk explain` output + release-notes API description.
- `res/instruct/fluent_instruct_<type>.md` — best-practices guide.
- `res/snippet/fluent_snippet_<type>_0001.md` (and `_0002.md` where the API has clear secondary patterns).

Source-of-truth approach for spec content:
- Run `now-sdk explain <ApiName> --format=raw` against a 4.6.0 scaffold to capture authoritative signatures (use ExplainCommand once Phase 4 lands, or invoke the CLI directly here).
- Cross-reference release notes + (if discoverable) SDK type definitions in `node_modules/@servicenow/sdk`.

**Verify**:
- `ls res/spec/ | wc -l` → 56 (52 + 4).
- `ResourceManager` registers four new URIs (`sn-spec://<type>`, `sn-instruct://<type>`, `sn-snippet://<type>/0001`).
- `npm test` — existing tests still pass.
- `npm run inspect` — browse new resources, confirm content renders.

**Gate**: approval to update existing resources.

### Phase 3 — Update existing specs / instructs / snippets for v4.6.0 additions (90 min)
Edit in-place (no new files, no new enum entries):

| File family | Update |
|---|---|
| `form` (spec/instruct + new snippet `_NNNN.md`) | Add declarative form configuration coverage. |
| `flow` (spec/instruct + new snippets) | Subflow→Subflow calls; Custom Action as step; cross-scope via deps. |
| `ai-agent`, `ai-agent-workflow` (instruct) | Note auto-ACL on build; remove or hedge any manual-ACL guidance. |
| `now-assist-skill-config` (spec/instruct + snippet) | Default outputs auto-emitted; new input types; `tableName`, `truncate` flags. |
| `table` (spec/instruct + snippet) | `sys_dictionary_override` directly via Table API. |
| `scheduled-script` (spec/instruct + snippet) | Module support in script fields. |
| `coding_in_fluent.md` prompt | Append v4.6.0 capabilities bullet (Subflow-of-Subflow, Custom Actions, auto-ACL). |

**Verify**: `npm test`; spot-check three updated specs via inspector.

**Gate**: approval to extend ExplainCommand.

### Phase 4 — ExplainCommand: new CLI flags + scaffold deletion (60 min)

**Phase 1 smoke surfaced a scope shift:** in v4.6.0, `now-sdk explain` self-resolves from its own bundle and no longer requires a Fluent project or `--source`. This means the entire scaffold machinery in `ExplainCommand` is redundant — we delete it rather than version-stamp it. This *also* resolves tech-debt #1 by elimination.

Edits to `src/tools/commands/explainCommand.ts`:
- **Delete** `cachedScaffoldDir`, `ensureScaffoldDir()`, `isFluentProject()`, and all scaffold-related logic (~80 lines of code removed).
- **Rename** the `api` argument to `topic` (matches SDK CLI semantics — accepts API names, guide names, or tag keywords) and make it **optional** (required only when neither `list` nor `tag` is used).
- **Add** optional arguments: `list` (boolean), `peek` (boolean), `format` (string: `raw` | `pretty`).
- **Drop** the always-on `--source` injection. Only pass `--source` when the caller supplies it explicitly.
- Update tool `description` to: (a) reflect that explain now covers both API references *and* guides (e.g. `business-rule-guide`, `atf-guide`, `building-ai-agents-guide`); (b) advertise `--list`, `--peek`, `--format`; (c) note that no Fluent project is required.
- Keep `readOnlyHint` / `idempotentHint` annotations.
- Also delete the scratch dir `.explain-scaffold/` from disk if it exists (one-time cleanup; safe — it's regenerable cache).

Update unit tests under `test/tools/commands/explainCommand.test.ts`:
- `--list` invocation builds `now-sdk explain --list` (no `--source`).
- `topic` positional with `--peek --format=raw` flags through correctly.
- Tag-style lookup (passing a tag keyword as `topic`) is just the standard positional — no special syntax.
- Optional `source` override still works when provided.
- Old scaffold tests removed.

**Verify:** `npm test`; manual inspector run hitting all new modes from a directory that is *not* a Fluent project.

**Gate:** approval to add the new-types integration test.

### Phase 5 — Tests (45 min)
- Create `test/sdk460-types.integration.test.ts` modeled on `sdk450-types.integration.test.ts`:
  - Enum entries: `CUSTOM_ACTION`, `INBOUND_EMAIL_ACTION`, `SP_HEADER_FOOTER`, `SP_PAGE_ROUTE_MAP`.
  - Spec/instruct/snippet file existence per new type.
  - ResourceManager URI lookup smoke per new type.
- Update `test/sdk450-types.integration.test.ts` only if it asserts an exact type count (else leave alone).
- Confirm prompt-manager test still loads `coding_in_fluent` after content edits.

**Verify**: `npm test -- --coverage` — coverage on `resourceLoader` / `resourceManager` / `explainCommand` does not regress; new test passes.

**Gate**: approval for the documentation & release pass.

### Phase 6 — Documentation & release housekeeping (30 min)
- `CLAUDE.md`: bump `@servicenow/sdk` ref to 4.5.0 → 4.6.0; extend the supported-metadata-types list with the four new types; note `explain` new flags.
- `doc/prd-fluent-mcp-servicenow.md` / `doc/epics-prd-fluent-mcp-servicenow.md`: add a "4.6.0 support" note where appropriate.
- **README.md** — full sync pass (see Phase 6a).
- `package.json` version bump (suggest `0.2.0` since this is feature-additive).
- Changelog entry (or PR description).

**Verify**: `npm run build && npm run inspect` end-to-end; final lint+test.

**Gate**: approval to open PR.

### Phase 6a — README.md sync (15 min)
`README.md` is 240 lines and is the front door for npm/GitHub readers. Update it to match the 4.6.0 reality:
- SDK version reference → `4.6.0`.
- Supported metadata types list — add `custom-action`, `inbound-email-action`, `sp-header-footer`, `sp-page-route-map`.
- `explain_fluent_api` tool description — document the new `--list`, `--peek`, `--format`, and tag-lookup modes with one example invocation each.
- Capabilities-table / feature-matrix sections (if any) — surface the v4.6.0 additions: declarative Form API, subflow-of-subflow, custom-action steps in flows, AIAF auto-ACL, NASK input/output enhancements, Table dict-override, ScheduledScript modules.
- Quickstart / install commands — verify `npm install` snippets still resolve cleanly.
- Diff `README.md` against `CLAUDE.md` after edits to ensure both tell the same story (CLAUDE.md is canonical for AI; README.md is canonical for humans — they must not contradict).

**Verify**: render README locally (or via GitHub preview) and visually scan; run `npm run inspect` and confirm every example in README actually works.

### Phase 6b — Snippet compilation validator (90–120 min)
Create `scripts/validate-snippets.mjs` (Node ESM script) that compiles every `res/snippet/fluent_snippet_*.md` against a real Fluent project to catch silent rot from SDK API changes.

**Design:**
1. **Scaffold a throwaway Fluent app** under `.snippet-validation/` (gitignored). Reuse `ExplainCommand`'s scaffold pattern but make it a *full* Fluent project (`now-sdk init --non-interactive` or hand-written: `now.config.json`, `package.json` with `@servicenow/sdk@4.6.0`, `src/` layout).
2. **Parse each snippet markdown** — extract fenced ```ts / ```javascript code blocks. Determine the metadata type from the filename (`fluent_snippet_<type>_NNNN.md` → `<type>`).
3. **Map type → SDK directory** — drop the extracted code into `src/<metadataType>/<snippet-id>.ts` inside the scaffold, generating any minimum boilerplate (e.g. for snippets that reference a parent table that doesn't exist, the script either generates a stub or marks the snippet as `validation: requires-context` in frontmatter).
4. **Run `now-sdk build`** once per batch (or once per metadata-type group) and capture per-file TypeScript / Fluent compile errors.
5. **Report**: emit a markdown summary at `coverage/snippet-validation.md` — total, passed, failed (with first error line), and skipped (with reason). Non-zero exit code if any snippet fails.

**Edge cases to handle:**
- Snippets that need cross-references (e.g. a `BusinessRule` that targets a custom table) — support a `// @validate:skip` or frontmatter `validation: skip` opt-out with reason.
- Snippets that intentionally show *fragments* (not full files) — same opt-out.
- ATF snippets that need an existing test stub — generate a paired ATF host.
- Auth-required commands (deploy, transform) — script must never invoke these; build-only.

**npm script wiring:**
- `package.json` → `"validate:snippets": "node scripts/validate-snippets.mjs"`
- Optionally gate CI on it: `"test:all": "npm test && npm run validate:snippets"` (decide after measuring runtime).

**Verify:**
- First run establishes a baseline — record which snippets pass cleanly on 4.6.0.
- Run before *and* after the Phase 3 snippet edits to confirm edits don't regress.
- Add `.snippet-validation/` to `.gitignore`.

**Future value:** every subsequent SDK upgrade can run this script in Phase 1 to surface API rot in minutes instead of by hand inspection.

### Phase 7 — Release verification (after merge)
- `npm run inspect:published` once published — confirm 4.6.0 surfaces to a real client.
- Run `init_fluent_app` → `build_fluent_app` → `pack_fluent_app` on a sample app exercising one new API (e.g. `InboundEmailAction`).
- Re-run `npm run validate:snippets` against the published package as a final acceptance gate.

---

## 4. Verification Matrix

| Check | Phase | How |
|---|---|---|
| Build clean on 4.6.0 | 1 | `npm run build` |
| All existing tests pass | 1, 2, 3, 4, 5 | `npm test` |
| Lint clean | every phase | `npm run lint` |
| 4 new resources discoverable | 2 | Inspector → Resources tab |
| Existing resources updated render correctly | 3 | Inspector spot-check |
| `explain --list` returns SDK API index | 4 | Inspector → tool call |
| `explain --peek --format=raw` returns markdown | 4 | Inspector → tool call |
| New-types integration test passes | 5 | `npx jest sdk460-types` |
| Coverage stable or improved | 5 | `npm test -- --coverage` |
| End-to-end on real instance | 7 | Manual: build + pack + deploy a sample 4.6.0 app |

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| SDK 4.6.0 changes `explain` output format and breaks scaffold-based lookup | Phase 1 smoke test catches this before any resource edits |
| New API surfaces not yet documented in SDK type defs | Cross-reference `now-sdk explain <api> --format=raw` plus release notes; flag any gap to user |
| Hardcoded type count in a downstream test | Grep before Phase 2 — known offender: `sdk450-types.integration.test.ts` line range 18-48 |
| Auto-ACL guidance conflicts with existing instruct content | Phase 3 review: search instruct files for "manual ACL" / "create ACL" patterns |
| `tableDefaultLanguage` deprecation surfaces a CLI warning during build | Deprecation is non-breaking per release notes; capture in changelog |

---

## 6. Tech-Debt Findings (top 3) — to address alongside or as follow-ups

A focused code-review pass surfaced three high-impact debts. Each is ranked by the degree to which it complicates *this* upgrade, then by independent severity.

### Debt 1 — `ExplainCommand` scaffold is obsolete in v4.6.0 (resolved by deletion)
**Category:** Architecture · **Severity:** High → **Resolved by Phase 4 scope** · **Blocks 4.6 upgrade:** Was Yes, now N/A

**Evidence (pre-upgrade):**
- `src/tools/commands/explainCommand.ts:49` — `private static cachedScaffoldDir` process-lifetime singleton; never cleared.
- `src/tools/commands/explainCommand.ts:153-162` — Symlinks the MCP server's own `node_modules` into `.explain-scaffold/`. After 4.5→4.6 the symlink resolves to new SDK while cached `now.config.json` was written by 4.5.
- `src/tools/commands/explainCommand.ts:116-119` — Cache validity check verifies only file *existence*, not content / SDK version freshness.

**Phase 1 finding that changes the fix:** v4.6.0 `now-sdk explain` self-resolves from its own bundle. Smoke-test confirmation: `npx @servicenow/sdk@4.6.0 explain BusinessRule` runs cleanly from `/tmp` with no Fluent project. The scaffold layer that the entire debt is built around no longer serves a purpose.

**Remediation:** **Delete the scaffold layer entirely** in Phase 4 (lines 49, 98-105, 112-172 — about 80 lines). No version-stamping needed because there's no cache. Cleanest possible resolution: less code, no cross-version risk, simpler tool semantics. One-time cleanup: remove the existing `.explain-scaffold/` directory on first run after upgrade.

**Fix-point:** Phase 4 (in-scope).

---

### Debt 2 — Split source of truth: enum vs filesystem scan for metadata types
**Category:** Architecture · **Severity:** High · **Complicates 4.6 upgrade:** Yes

**Evidence:**
- `src/utils/resourceLoader.ts:42-45` — `readdir` is called twice on the same directory (first result discarded); the comment says "check if the spec directory exists" but `fs.promises.access` is the correct primitive.
- `src/utils/resourceLoader.ts:56-59` — Silent fallback to `Object.values(ServiceNowMetadataType)` on any scan error. A transient FS hiccup serves a stale hardcoded list, and callers cannot tell the difference.
- `src/res/resourceManager.ts:83,190` — `getAvailableMetadataTypes()` called from both `initialize()` and defensively inside `listResources()` — when listing without prior init, four FS reads per response.

**Why now:** Phase 2 adds four new types. A future contributor who drops new snippet files but forgets the enum entry (or vice-versa) creates invisible divergence — the bug manifests only on filesystem-error paths.

**Remediation sketch:** Pick one source of truth:
- **Option A (recommended):** Keep `ServiceNowMetadataType` as canonical. Drop the dynamic scan; require contributors to update the enum *and* drop the resource files. Loud failure on missing files (current behavior of `loadResource`) is sufficient.
- **Option B:** Make filesystem the canonical source. Remove the enum entirely. The discovery scan becomes load-bearing — fix the double `readdir`, replace existence-probe with `access`, and remove the silent fallback (let errors surface).

Either way, cache the resolved list once at server startup. Fix the double `readdir` regardless.

**Recommended fix-point:** Phase 2 (defensive — the upgrade is the moment the divergence risk is highest). If schedule pressure intervenes, split into a follow-up PR scheduled immediately after Phase 7.

---

### Debt 3 — `SamplingManager` is dead code wired into the constructor
**Category:** Code Quality / MCP best practices · **Severity:** Medium · **Blocks 4.6 upgrade:** No

**Evidence:**
- `src/server/fluentMCPServer.ts:85` — `this.samplingManager = new SamplingManager(this.mcpServer)` is the only line that ever touches the field; no method call site exists anywhere in `src/`.
- `src/utils/samplingManager.ts:208-223` — `formatAnalysis()` embeds raw emoji in strings intended for MCP tool result content. Inconsistent with the project's `stripAnsi` discipline elsewhere and wastes tokens.

**Why now:** The MCP SDK's `createMessage` API has been a moving target across recent releases — a quietly-dead code path now is a *loud* runtime crash the day someone tries to wire it up. Better to either commit to the feature or excise it.

**Remediation sketch:** Two acceptable resolutions, both small:
1. **Wire it up:** Call `samplingManager.analyzeError(...)` from `CLIExecutor`'s failure path when the result is `isError: true` and the stderr is substantive. Strip emoji from `formatAnalysis()`. Gate behind a config flag (MCP sampling is a *client* capability — must check the client supports it before invoking).
2. **Delete it:** Remove the field, the import, and `src/utils/samplingManager.ts`. Re-introduce when sampling-driven error analysis is actually needed.

**Recommended fix-point:** Follow-up PR after the 4.6 upgrade lands — not in scope here. Logged so it doesn't slip.

---

### Tech-debt summary table

| # | Debt | Fix-point | Effort |
|---|------|-----------|--------|
| 1 | Explain scaffold (now obsolete) | **Phase 4** (in-scope) — delete entirely | 20 min |
| 2 | Enum / filesystem dual source of truth | **Phase 2** preferred, else follow-up PR | 1–2 hr |
| 3 | Dead `SamplingManager` | Follow-up PR (delete or wire up) | 30 min – 2 hr |

---

## 7. Out of Scope

- Migrating any existing customer apps (this MCP server does not own customer projects).
- Adding new prompts beyond updating `coding_in_fluent.md` content.
- Re-architecting `ResourceLoader` (current dynamic-scan approach already absorbs new types).
- Supporting SDK versions older than 4.5.0 — this is a forward-only bump.

---

## 8. Approval Checkpoints

Awaiting user approval at:
- **Pre-Phase 0** (this plan)
- After Phase 1 (post-bump smoke)
- After Phase 2 (new types added; tech-debt #2 either resolved or deferred)
- After Phase 3 (existing resources updated)
- After Phase 4 (ExplainCommand extended; tech-debt #1 fix included)
- After Phase 5 (tests green)
- After Phase 6 (CLAUDE.md / README synced, snippet validator merged, PR ready)
