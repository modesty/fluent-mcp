---
name: fluent-security-review
description: Perform a ServiceNow App security review across all 46 security checks for either Fluent (now.config.json) **or** classic XML (update/) applications.
license: Apache-2.0
compatibility: Works with Fluent projects (src/, metadata/) and classic ServiceNow XML apps (update/, unload/)
allowed-tools: Bash(node *)
metadata:
  argument-hint: "[app-directory]"
---

## Setup

Condition: Works on **any** ServiceNow application repository — `now.config.json` is optional.

Action: Detect the application structure and scope before running the 46 security checks:

1. **Fluent App (`now.config.json` present):**
   - Read `scope` and `scopeId` from `now.config.json`.
   - Scan Fluent source files under `src/` (`.now.ts`, `.ts`, `.js`, `.html`, `.scss`) and XML files under `metadata/` (including `metadata/update/` and `metadata/unload*/`).
2. **Classic / Non-Fluent App (no `now.config.json`):**
   - Read scope from `sys_app_*.xml`, `sys_store_app_*.xml`, or `<sys_scope>` tags.
   - Scan all XML payload files under `update/`, `unload/` (`unload.demo`), and `dictionary/`.
3. **Hybrid App:** Scan all of `src/`, `metadata/`, `update/`, `unload/`, and `dictionary/`.

Rule: Run the security baseline scanner script first:

```bash
node <skill-dir>/scripts/scan_security_checks.mjs <app-directory>
```

Then read all four reference files in order and evaluate all 46 checks against the detected files (combining the deterministic script output with semantic inspection of context-dependent access control, data flow, and endpoint logic). Mark checks targeting absent artifact types as **N/A** (count as passed/compliant where relevant).

---

## Security Checks (46 Items — Sorted by Risk Level)

Read all four reference files in order and evaluate every check against the detected application files:

1. **Critical Risk Checks (7 checks)**: Read [references/critical_risk_checks.md](./references/critical_risk_checks.md)
2. **High Risk Checks (26 checks)**: Read [references/high_risk_checks.md](./references/high_risk_checks.md)
3. **Medium Risk Checks (12 checks)**: Read [references/medium_risk_checks.md](./references/medium_risk_checks.md)
4. **Low / Process Risk Checks (1 check)**: Read [references/low_risk_checks.md](./references/low_risk_checks.md)

---

## Priority Definitions

- **P0 (Show Stopper):** Critical vulnerability or cross-scope/instance compromise risk
- **P1 (Must Fix):** High-severity security gap
- **P2 (Recommend to Fix):** Context-dependent exposure
- **P3 (Better to Fix / Nice to Have):** Packaging hygiene and privacy compliance
- **P4 (Reminder / Info):** Informational observation or manual post-install documentation reminder

---

## Output Format (Markdown)

Always produce the review report using this exact Markdown structure:

```markdown
# Security Review Report: <App Name> (`<scope>`)

- **App Type:** Fluent (`now.config.json`) | Classic XML (`update/`) | Hybrid
- **Files Scanned:** <count and paths summary>
- **Checks Evaluated:** 46 (Passed: <X>, Failed: <Y>, N/A: <Z>)

## Exemplary Practices

- Concisely summarize all passed checks grouped by area (e.g., Scoped Access Control, Injection & Script Safety, Secrets & Data Protection, Portal/UI Security, Packaging Hygiene).

## Findings

*(If no checks failed, write: "No security findings detected.")*

### [P0 | P1 | P2 | P3 | P4] `<check_id>` — <Check Title> (Impact: Critical | High | Medium | Low)
- **Location:** `<file_path>:<line>`
- **Issue:** Brief, clear statement of what failed.
- **Suggested Fix:** Brief, clear, actionable remediation in plain English (with a minimal code/XML snippet when helpful).

## Conclusion

- **Status:** **PASS** *(0 P0/P1 findings)* | **FAIL** *(1 or more P0/P1 findings, or unresolved P2 security exposures)*
- **Recommended Next Steps:**
  1. Ordered, concise action items to remediate P0 → P1 → P2 → P3 findings and pass the security review.
```
