---
name: fluent-security-review
description: Perform a ServiceNow App security review across all 46 security checks for either Fluent (now.config.json) **or** classic XML (update/) applications.
license: Apache-2.0
compatibility: Works with Fluent projects (src/, metadata/) and classic ServiceNow XML apps (update/, unload/)
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
   - Scan all XML payload files under `update/` and `unload/` (`unload.demo`).
3. **Hybrid App:** Scan all of `src/`, `metadata/`, `update/`, and `unload/`.

Rule: Evaluate every check below against the detected files. Mark checks targeting absent artifact types as **N/A** (count as passed/compliant where relevant).

---

## Security Checks (46 Items — Sorted by Impact)

Read all three reference files in order and evaluate every check against the detected application files:

1. **High Impact (16 checks)** — Cross-scope, global, system, or instance-wide exposure:
   - Read [references/high_impact.md](./references/high_impact.md)
2. **Medium Impact (25 checks)** — Scoped application data, endpoints, UI, and access control:
   - Read [references/medium_impact.md](./references/medium_impact.md)
3. **Low Impact (5 checks)** — Supply chain, packaging hygiene, privacy, and defense-in-depth:
   - Read [references/low_impact.md](./references/low_impact.md)

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

### [P0 | P1 | P2 | P3 | P4] `<check_id>` — <Check Title> (Impact: High | Medium | Low)
- **Location:** `<file_path>:<line>`
- **Issue:** Brief, clear statement of what failed.
- **Suggested Fix:** Brief, clear, actionable remediation in plain English (with a minimal code/XML snippet when helpful).

## Conclusion

- **Status:** **PASS** *(0 P0/P1 findings)* | **FAIL** *(1 or more P0/P1 findings, or unresolved P2 security exposures)*
- **Recommended Next Steps:**
  1. Ordered, concise action items to remediate P0 → P1 → P2 → P3 findings and pass the security review.
```
