# High Impact Security Checks (16)

Items that can impact other scopes, global/system state, or instance-wide metadata and security.

1. **`acl_with_nobody_or_public_role` — ACL with Nobody/Public Role** [P0]
   - *Check:* Inspect `Acl()` definitions and `sys_security_acl_role*.xml` for `nobody` or `public` roles. (`nobody` can irreversibly lock system functions; `public` exposes resources without login.)
   - *Fix:* Remove `nobody` and `public` roles from all ACLs; use scoped application roles.
2. **`out_of_scope_acl` — ACL Created on Out-of-Scope Tables** [P0]
   - *Check:* Verify no `Acl()` or `sys_security_acl*.xml` targets a table or resource outside the application's scope prefix.
   - *Fix:* Delete ACLs and ACL role mappings created on out-of-scope or OOB tables.
3. **`fix_script` — Fix Script Performing Out-of-Scope CRUD** [P0]
   - *Check:* Inspect `sys_script_fix*.xml` or fix scripts for `insert()`, `update()`, `deleteRecord()`, or `deleteMultiple()` on out-of-scope tables, or record deletions.
   - *Fix:* Remove out-of-scope CRUD and record deletion logic from fix scripts.
4. **`rca_target_scope_mismatch` — RCA Scope Mismatch with Target Scope** [P1]
   - *Check:* Inspect `CrossScopePrivilege()` or `sys_scope_privilege*.xml` records. Ensure `source_scope` is the app scope and `target_scope` matches the target resource's owning scope.
   - *Fix:* Set `target_scope` to the target artifact's actual scope. If target uses `Caller Restriction`, document manual admin approval of the Real RCA in the Installation Guide.
5. **`si_restricted` — Restricted API / Java Package Calls** [P1]
   - *Check:* Search server scripts (excluding MID Server Script Includes `sys_script_include` for MID) for `Packages.*` or blocked global APIs.
   - *Fix:* Replace Java `Packages.*` and restricted global calls with supported Scoped Glide APIs.
6. **`script_type_column` — Column of Type Script Field** [P0]
   - *Check:* Inspect `Table()` columns (`ScriptColumn` / `type: 'script'` or `script_plain`) and `sys_dictionary*.xml` (`internal_type=script*`).
   - *Fix:* Restrict write/create ACLs on any `script`-type column strictly to `admin` (or remove the script column).
7. **`glidescopedevaluator` — GlideScopedEvaluator Dynamic Execution** [P1]
   - *Check:* Search for `GlideScopedEvaluator`. Verify the evaluated script field is writable only by `admin`, never built via string concatenation, and never sourced from 3rd parties.
   - *Fix:* Eliminate string concatenation in evaluated scripts, lock the source field write ACL to `admin`, and validate script origin.
8. **`Eval Used` — JavaScript `eval()` Usage** [P1]
   - *Check:* Search all client and server scripts for `eval(`, `new Function(`, or string-based `setTimeout(`/`setInterval(`.
   - *Fix:* Remove `eval()` and dynamic code evaluation; use `JSON.parse()` or safe structured logic.
9. **`dynamic_input_add_encoded_query` — Dynamic Input in `addEncodedQuery()`** [P0]
   - *Check:* Find `addEncodedQuery(` with concatenated variables or stored fields (e.g., `description`), which enables blind query ACL bypass across instance tables (KB0010217).
   - *Fix:* Replace with `gr.addQuery(field, operator, value)`, or wrap dynamic values in `GlideStringUtil.escapeQueryTermSeparator(val)` and pass `true` as the 2nd argument: `gr.addEncodedQuery(query, true)`.
10. **`idor` — Insecure Direct Object Reference (IDOR)** [P0]
    - *Check:* Inspect client-reachable entry points (Scripted REST, CCSI, UI Pages, Service Portal widgets, UI Actions) that pass user-supplied `sys_id`, table names, or record keys into `GlideRecord` without ownership/ACL checks.
    - *Fix:* Validate record ownership and permissions server-side using `GlideRecordSecure` or `canRead()`/`canWrite()`/`canCreate()`/`canDelete()`.
11. **`manual_security_review` — Deep Static Security Review (JARVIS / Platform Vectors)** [P0]
    - *Check:* Scan for high-risk platform vectors: `GlideEvaluator`/`GlideFilter`/`GlideController` with user input, `setDisplayValue()` on password fields, `GlideEncrypter`, unencrypted `http://` endpoints (KB0010088), `Math.random()` for security tokens (KB0010151), and missing `invoke_from_ai` ACLs on AI-invoked flows/actions (KB0010250).
    - *Fix:* Use `GlideSecureRandomUtil` for tokens, `https://` for external endpoints, KMF/`CertificateEncryption` instead of `GlideEncrypter`, and add `flow`/`flow_action` ACLs with `invoke_from_ai` operation and `UserIsAuthenticated` attribute for AI-called flows.
12. **`password_properties` — Non-Blank Password System Properties** [P0]
    - *Check:* Inspect `Property()` (`type: 'password'` or `'password2'`) and `sys_properties*.xml` for non-empty default `value` fields.
    - *Fix:* Clear the `value` field to blank (`""`) on all `password`/`password2` properties.
13. **`sensitive_data_found` — Hardcoded Tokens/Secrets in Artifacts** [P0]
    - *Check:* Scan all scripts, properties, REST headers, and comments (KB0010073) for hardcoded API keys, Bearer tokens, passwords, session IDs, or private URLs/IPs.
    - *Fix:* Remove hardcoded secrets and sensitive comments; store credentials in Connections & Credentials (`sys_alias`) or blank `password2` properties.
14. **`demo_data` — Unintended or Sensitive Demo Data** [P1]
    - *Check:* Inspect `unload.demo` / `metadata/unload.demo` or packaged `Record()` data for user records (`sys_user`), credentials, test artifacts, or customer data.
    - *Fix:* Remove sensitive or unintended demo records from the package.
15. **`found_scheduled_email` — Scheduled Outbound Email / Report / Flow / Job** [P1]
    - *Check:* Inspect `sysauto_report`, `sysauto_script`, `wf_workflow_schedule`, `sys_hub_flow`, and `sysauto` (`ScheduledScript()`) for automated outbound emails or external data transmission.
    - *Fix:* Gate scheduled reports/jobs behind an opt-in system property (`false` by default) so data is only sent with explicit customer consent.
16. **`cors_rules` — Wildcard Origin in CORS Rules** [P1]
    - *Check:* Inspect `sys_cors_rule*.xml` for wildcard `*` in the `domain` (Origin) field.
    - *Fix:* Replace `*` with a specific, fully qualified domain name (FQDN).
