---
name: fluent-domain-separation-review
description: Perform Domain Separation / MSP Readiness review for ServiceNow Scoped applications, either Fluent (now.config.json) **or** classic XML (update/) applications that must run on domain-separated (MSP Ready/ multi-tenant) instances.
license: Apache-2.0
compatibility: Works with Fluent projects (src/, metadata/) and classic ServiceNow XML apps (update/, unload/)
allowed-tools: Bash(node *)
metadata:
  argument-hint: "[app-directory]"
---

## Applicability (MSP Ready / Domain Separation Target Only)

> **IMPORTANT:** This skill is **ONLY applicable to applications that must run on domain-separated (MSP / multi-tenant) instances**, or when a developer explicitly requests a Domain Separation / multi-tenant readiness audit.
>
> - Applications that do not target domain-separated instances do **not** require `sys_domain`, `sys_overrides`, or `getDefaultDomain` Business Rules (though `ui_action_sys_overrides` and `br_sys_domain` remain good baseline packaging hygiene).
> - If it is unclear whether the application targets **MSP Ready / Domain Separation**, confirm with the user or note the domain-separation assumption at the top of the report.

---

## Setup

Condition: Works on **any** ServiceNow application repository targeting MSP / Domain Separation — `now.config.json` is optional.

Action: Detect the application structure and scope before running the 10 Domain Separation / MSP checks:

1. **Fluent App (`now.config.json` present):**
   - Read `scope` and `scopeId` from `now.config.json`.
   - Scan Fluent source files under `src/` (`.now.ts`, `.ts`, `.js`) and XML files under `metadata/` (including `metadata/update/` and `metadata/unload*/`).
2. **Classic / Non-Fluent App (no `now.config.json`):**
   - Read scope from `sys_app_*.xml`, `sys_store_app_*.xml`, or `<sys_scope>` tags.
   - Scan all XML payload files under `update/`, `unload/` (`unload.demo`), and `dictionary/`.
3. **Hybrid App:** Scan all of `src/`, `metadata/`, `update/`, `unload/`, and `dictionary/`.

Rule: Run the deterministic MSP baseline scanner first:

```bash
node <skill-dir>/scripts/scan_msp_checks.mjs <app-directory>
```

Then read [references/msp_checks.md](./references/msp_checks.md) and evaluate all 10 checks against the detected files (combining the deterministic script output with semantic inspection of custom data vs. process tables, business rule domain logic, and import set roles). Mark checks targeting absent artifact types as **N/A** (count as passed/compliant where relevant).

---

## Domain Separation / MSP Checks (10 Items)

Read the reference file and evaluate every check against the detected application files:

1. **MSP & Domain Separation Checks (10 checks)** — Cross-scope `getDefaultDomain` privilege, `sys_domain` on data tables, `sys_overrides` on metadata/process tables, global-domain baseline packaging, empty `sys_overrides` on UI Actions, default-domain and set-domain Business Rules, async Business Rule domain context, Transform Map `run_business_rules`, and Import Set table role isolation:
   - Read [references/msp_checks.md](./references/msp_checks.md)

---

## Priority Definitions

- **P0 (Show Stopper):** Critical cross-tenant data leakage or missing runtime privilege that breaks MSP instances (`getDefaultDomain`)
- **P1 (Must Fix):** High-severity tenant isolation gap, missing `sys_domain` / `sys_overrides` schema support, or non-global baseline domain capture
- **P2 (Recommend to Fix):** Context-dependent domain assignment logic in Business Rules, Async BRs, or Transform Maps
- **P3 (Better to Fix / Nice to Have):** Minor domain override hygiene or role hardening
- **P4 (Reminder / Info):** Informational observation or manual MSP installation/plugin-order documentation reminder

---

## Output Format (Markdown)

Always produce the review report using this exact Markdown structure:

```markdown
# Domain Separation (MSP) Review Report: <App Name> (`<scope>`)

- **App Type:** Fluent (`now.config.json`) | Classic XML (`update/`) | Hybrid
- **Files Scanned:** <count and paths summary>
- **Checks Evaluated:** 10 (Passed: <X>, Failed: <Y>, N/A: <Z>)

## Exemplary Practices

- Concisely summarize all passed checks grouped by area (e.g., Baseline Global Domain Hygiene, Tenant Data Separation (`sys_domain`), Process Override Support (`sys_overrides`), Domain Business Rule Logic, Import Set Tenant Isolation).

## Findings

*(If no checks failed, write: "No domain separation / MSP findings detected.")*

### [P0 | P1 | P2 | P3 | P4] `<check_id>` — <Check Title> (Impact: Critical | High | Medium | Low)
- **Location:** `<file_path>:<line>`
- **Issue:** Brief, clear statement of what failed.
- **Suggested Fix:** Brief, clear, actionable remediation in plain English (with a minimal code/XML snippet when helpful).

## Conclusion

- **Status:** **PASS** *(0 P0/P1 findings)* | **FAIL** *(1 or more P0/P1 findings, or unresolved P2 tenant-isolation exposures)*
- **Recommended Next Steps:**
  1. Ordered, concise action items to remediate P0 → P1 → P2 → P3 findings and make the app domain-separation ready.
```
