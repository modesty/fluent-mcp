---
name: fluent-general-review
description: Perform general best-practice review for ServiceNow scoped app, covering generic Scripting and Configuration checks for either Fluent (now.config.json) **or** classic XML (update/) applications.
license: Apache-2.0
compatibility: Works with Fluent projects (src/, metadata/) and classic ServiceNow XML apps (update/, unload/)
allowed-tools: Bash(node *)
metadata:
  argument-hint: "[app-directory]"
---

## Setup

Condition: Works on **any** ServiceNow application repository — `now.config.json` is optional.

Action: Detect the application structure and scope before running the 31 general best-practice checks:

1. **Fluent App (`now.config.json` present):**
   - Read `scope` and `scopeId` from `now.config.json` (and `dependencies` from `package.json` / `now.config.json`).
   - Scan Fluent source files under `src/` (`.now.ts`, `.ts`, `.js`, `.html`, `.scss`) and XML files under `metadata/` (including `metadata/update/` and `metadata/unload*/`).
2. **Classic / Non-Fluent App (no `now.config.json`):**
   - Read scope from `sys_app_*.xml`, `sys_store_app_*.xml`, or `<sys_scope>` tags.
   - Scan all XML payload files under `update/`, `unload/` (`unload.demo`), and `dictionary/`.
3. **Hybrid App:** Scan all of `src/`, `metadata/`, `update/`, `unload/`, and `dictionary/`.

Rule: Run the deterministic baseline scanner first:

```bash
node <skill-dir>/scripts/scan_general_checks.mjs <app-directory>
```

Then read both reference files in order and evaluate all 31 checks against the detected files (using the script output for deterministic verification plus semantic inspection for context-dependent checks). Mark checks targeting absent artifact types as **N/A** (count as passed/compliant where relevant).

---

## General Best-Practice Checks (31 Items — Scripting & Configuration)

Read both reference files in order and evaluate every check against the detected application files:

1. **Scripting Checks (15 checks)** — Server-side GlideScript (`GlideRecord`, `GlideSystem`, Read ACL scripts, Workflow scripts) and Client-side Browser scripts (`GlideAjax`, `g_form`, `onChange`):
   - Read [references/scripting_checks.md](./references/scripting_checks.md)
2. **Configuration Checks (16 checks)** — Table & schema footprint on OOB tables, custom roles, dependencies, scheduled jobs, Transform Maps, CMDB Discovery sources, PA, HR, Workflow approvers, and UX modules:
   - Read [references/config_checks.md](./references/config_checks.md)

---

## Priority Definitions

- **P0 (Show Stopper):** Critical runtime failure or prohibited core table extension risk
- **P1 (Must Fix):** High-severity functional breakage, runtime exception in scoped apps, or shared OOB schema/provider conflict
- **P2 (Recommend to Fix):** Context-dependent performance, maintainability, or cross-instance portability risk
- **P3 (Better to Fix / Nice to Have):** Authoring hygiene, client-side guard, or declarative UI preference
- **P4 (Reminder / Info):** Informational observation, legacy/obsolete check (enforced by platform runtime), or optional UX guidance

---

## Output Format (Markdown)

Always produce the review report using this exact Markdown structure:

```markdown
# General Best-Practice Review Report: <App Name> (`<scope>`)

- **App Type:** Fluent (`now.config.json`) | Classic XML (`update/`) | Hybrid
- **Files Scanned:** <count and paths summary>
- **Checks Evaluated:** 31 (Passed: <X>, Failed: <Y>, N/A: <Z>)

## Exemplary Practices

- Concisely summarize all passed checks grouped by area (e.g., Server GlideScript Safety, Client Script Performance, OOB Schema Hygiene, Role & Dependency Configuration, Integration & Feature Configuration).

## Findings

*(If no checks failed, write: "No general best-practice findings detected.")*

### [P0 | P1 | P2 | P3 | P4] `<check_id>` — <Check Title> (Impact: Critical | High | Medium | Low)
- **Location:** `<file_path>:<line>`
- **Issue:** Brief, clear statement of what failed.
- **Suggested Fix:** Brief, clear, actionable remediation in plain English (with a minimal code/XML snippet when helpful).

## Conclusion

- **Status:** **PASS** *(0 P0/P1 findings)* | **FAIL** *(1 or more P0/P1 findings, or unresolved P2 functional/portability exposures)*
- **Recommended Next Steps:**
  1. Ordered, concise action items to remediate P0 → P1 → P2 → P3 findings and pass the best-practice review.
```
