---
name: fluent-perf-review
description: Perform a ServiceNow App performance review across all 18 Performance certification checks (plus general memory, CPU, and query efficiency) for either Fluent (now.config.json) **or** classic XML (update/) applications.
license: Apache-2.0
compatibility: Works with Fluent projects (src/, metadata/) and classic ServiceNow XML apps (update/, unload/)
allowed-tools: Bash(node *)
metadata:
  argument-hint: "[app-directory] [--baseline <previous-version-dir>]"
---

## Setup

Condition: Works on **any** ServiceNow application repository — `now.config.json` is optional.

Action: Detect the application structure and scope before running the 18 performance checks:

1. **Fluent App (`now.config.json` present):**
   - Read `scope` and `scopeId` from `now.config.json`.
   - Scan Fluent source files under `src/` (`.now.ts`, `.ts`, `.js`, `.html`) and XML files under `metadata/` (including `metadata/update/` and `metadata/unload*/`).
2. **Classic / Non-Fluent App (no `now.config.json`):**
   - Read scope from `sys_app_*.xml`, `sys_store_app_*.xml`, or `<sys_scope>` tags.
   - Scan all XML payload files under `update/`, `unload/` (`unload.demo`), and `dictionary/`.
3. **Hybrid App:** Scan all of `src/`, `metadata/`, `update/`, `unload/`, and `dictionary/`.

Rule: Run the deterministic performance scanner first (add `--baseline` for a recertification):

```bash
node <skill-dir>/scripts/scan_perf_checks.mjs <app-directory> [--baseline <previous-version-dir>]
```

Then read both reference files in order and evaluate all 18 checks against the detected files. The script resolves Business Rule / transform timing and `Now.include()` / imported server modules, but it cannot follow calls into Script Includes or judge intent — confirm each finding semantically, and evaluate `sys_direct_ws` (and `dictionary_type_change` without a baseline) manually. Mark checks targeting absent artifact types as **N/A** (count as passed/compliant where relevant).

Scope: Do not limit the review to these 18 items. Also review the code for general memory, CPU, and database-query efficiency, and report notable issues under the `general_performance` check ID.

---

## Performance Checks (18 Items — Scripting & Configuration)

Read both reference files in order and evaluate every check against the detected application files:

1. **Scripting Checks (12 checks)** — Business Rule recursion and inserts, onBefore transform inserts, FlowAPI in async BRs, synchronous / blocking outbound calls, `gs.setProperty()`, `sys_audit` queries, unbounded XML parsing, JEXL in `<g:evaluate>`, `sys_id` dot-walking, and leading-wildcard query operators:
   - Read [references/scripting_checks.md](./references/scripting_checks.md)
2. **Configuration Checks (6 checks)** — Dictionary type changes, direct web service writes, Robust Transform verbosity, JDBC delta imports, reports on `sys_audit`, and packaged database indexes:
   - Read [references/config_checks.md](./references/config_checks.md)

---

## Priority Definitions

- **P0 (Show Stopper):** Recursion, data-conversion, or instance-wide outage risk
- **P1 (Must Fix):** High-severity performance degradation (blocked threads, full-table scans of huge tables, excessive logging/imports)
- **P2 (Recommend to Fix):** Context-dependent load, cache, or scalability risk
- **P3 (Better to Fix / Nice to Have):** Minor query or scripting inefficiency
- **P4 (Reminder / Info):** Informational observation or justified exemption

---

## Output Format (Markdown)

Always produce the review report using this exact Markdown structure:

```markdown
# Performance Review Report: <App Name> (`<scope>`)

- **App Type:** Fluent (`now.config.json`) | Classic XML (`update/`) | Hybrid
- **Files Scanned:** <count and paths summary>
- **Checks Evaluated:** 18 (Passed: <X>, Failed: <Y>, N/A: <Z>)

## Exemplary Practices

- Concisely summarize all passed checks grouped by area (e.g., Business Rule Hygiene, Asynchronous Integration, Query & Large-Table Efficiency, Import & Transform Configuration, Schema & Reporting Footprint).

## Findings

*(If no checks failed, write: "No performance findings detected.")*

### [P0 | P1 | P2 | P3 | P4] `<check_id>` — <Check Title> (Impact: Critical | High | Medium | Low)
- **Location:** `<file_path>:<line>`
- **Issue:** Brief, clear statement of what failed.
- **Suggested Fix:** Brief, clear, actionable remediation in plain English (with a minimal code/XML snippet when helpful).

## Conclusion

- **Status:** **PASS** *(0 P0/P1 findings)* | **FAIL** *(1 or more P0/P1 findings, or unresolved P2 scalability exposures)*
- **Recommended Next Steps:**
  1. Ordered, concise action items to remediate P0 → P1 → P2 → P3 findings and pass the performance review.
```
