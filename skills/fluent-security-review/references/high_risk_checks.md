# High Risk Security Checks

Security checks classified as **High** risk for ServiceNow scoped applications.

1. **`out_of_scope_acl` — ACL Created on Out-of-Scope Tables** [P0] (Impact: High)
   - *Check:* Inspect `Acl()` definitions, `sys_security_acl*.xml`, and `sys_security_acl_role*.xml` for table/record ACLs targeting tables outside the application's `<scope>_` namespace (unless the ACL specifically targets an application-owned custom column `<table>.<scope>_<field>`). Shipping ACLs or ACL roles on out-of-scope or OOB tables can alter platform table permissions for customer users.
   - *Fix:* Remove ACLs and ACL role records targeting out-of-scope tables.

2. **`acl_on_agentic_ai_partner` — ACL on AI Agent** [P1] (Impact: High)
   - *Check:* Inspect `AiAgent()` (`sn_aia_agent*.xml`) records. Verify an `execute` ACL (`sys_security_acl`) of type `gen_ai_agent` (`fc55e9f79f8222109570e67e8a0a1c34`) exists whose `name` matches the agent's `internal_name` and is backed by at least one access control (`sys_security_acl_role`, `security_attribute`, `condition`, or `advanced` `script`), and that `AiAgent()` defines least-privilege role restrictions (`acl` / `roleMap` / `dataAccess`).
   - *Fix:* Create a `gen_ai_agent` `execute` ACL matching the AI Agent's `internal_name` and configure least-privilege roles so the agent only accesses required data.

3. **`acl_on_agentic_ai_usecase_partner` — ACL on AI Use Case** [P1] (Impact: High)
   - *Check:* Inspect `AiAgenticWorkflow()` (`sn_aia_usecase*.xml`) records. Verify an `execute` ACL (`sys_security_acl`) of type `gen_ai_workflow` (`d9eb25b39fc222109570e67e8a0a1c6a`) exists whose `name` matches the use case's `internal_name` and is backed by at least one access control (`sys_security_acl_role`, `security_attribute`, `condition`, or `advanced` `script`).
   - *Fix:* Create a `gen_ai_workflow` `execute` ACL matching the Agentic Use Case's `internal_name` with least-privilege roles restricting who can trigger or access the use case.

4. **`ccsi_acl` — ACL on Client-Callable Script Include** [P1] (Impact: High)
   - *Check:* Inspect `ScriptInclude({ clientCallable: true })` and `sys_script_include*.xml` with `<client_callable>true</client_callable>`. Verify a `sys_security_acl` of type `client_callable_script_include` (`operation: 'execute'`) matching the Script Include `name` exists and has required roles assigned in `sys_security_acl_role` (or uses `GlideRecordSecure` across all functions).
   - *Fix:* Add a `client_callable_script_include` `execute` ACL with scoped roles for every client-callable Script Include, or enforce `GlideRecordSecure` in all functions.

5. **`acl_on_gen_ai_skill_partner` — ACL on Gen AI Skill** [P1] (Impact: High)
   - *Check:* Inspect `NowAssistSkillConfig()` (`sn_nowassist_skill_config*.xml`) records. Verify an `execute` ACL (`sys_security_acl`) of type `gen_ai_skill` (`0d986410ffdd2210c0e9ffffffffffc9`) exists whose `name` ends with the skill configuration `sys_id` and is backed by at least one access control (`sys_security_acl_role`, `security_attribute`, `condition`, or `advanced` `script`), and check `roleMap` on `NowAssistSkillConfig()`.
   - *Fix:* Add a `gen_ai_skill` `execute` ACL and least-privilege `roleMap` roles to restrict who can trigger the NASK skill and what data it can evaluate.

6. **`processor_acl` — ACL on Processor** *(Legacy — Processors deprecated since Madrid)* [P1] (Impact: High)
   - *Check:* If `sys_processor*.xml` exists, verify an `execute` ACL (`sys_security_acl` of type `processor`) exists for the processor `name` / `path` with at least one role in `sys_security_acl_role` (or `<roles>` populated on the processor).
   - *Fix:* Create a `processor` `execute` ACL secured with scoped roles, or migrate the legacy Processor to a Scripted REST API (`RestApi()`).

7. **`table_acl` — ACL on Table** [P1] (Impact: High)
   - *Check:* For every custom scoped table (`Table()` in `.now.ts`, `sys_db_object*.xml`, `dictionary/*.xml`), verify table-level `record` ACLs (`Acl()` / `sys_security_acl` with no `.` or `*` in `name`) exist for all four `create`, `read`, `write`, and `delete` operations and each has at least one role in `sys_security_acl_role` (`roles`).
   - *Fix:* Create `record` ACLs covering `create`, `read`, `write`, and `delete` operations with scoped application roles for every custom table.

8. **`ui_page_acl` — ACL on UI Page** [P1] (Impact: High)
   - *Check:* For every `UiPage()` or `sys_ui_page*.xml`, strip `.do` from `endpoint` (`endpoint.slice(0, -3)`) and verify a `ui_page` `read` ACL (`Acl({ type: 'ui_page', operation: 'read' })` / `sys_security_acl`) exists with `name` equal to the endpoint URI without `.do` and has at least one role in `sys_security_acl_role`.
   - *Fix:* Create a `read` ACL of type `ui_page` against the UI Page endpoint URI (without `.do`) and secure it with scoped roles.

9. **`cors_rules` — CORS Rules** [P1] (Impact: High)
   - *Check:* Inspect `sys_cors_rule*.xml` (and `Record({ table: 'sys_cors_rule' })`) for a wildcard `*` in `<domain>` (Origin) **or** `<delete>true</delete>` (`DELETE` HTTP method enabled).
   - *Fix:* Use a specific, fully qualified domain name (FQDN) without wildcard `*` in `<domain>`, and set `<delete>false</delete>` unless explicitly required and justified.

10. **`demo_data` — Demo Data** [P1] (Impact: High)
    - *Check:* Inspect `unload.demo` / `metadata/unload.demo` files and `Record()` entries with `$meta: { installMethod: 'demo' }` to confirm whether demo data was captured intentionally and does not contain sensitive data, credentials, or unintended user records (`sys_user`).
    - *Fix:* Remove unintended or sensitive demo data records from `unload.demo` before packaging.

11. **`external_sources` — External Sources ⚑** [P2] (Impact: High)
    - *Check:* Scan `sys_ui_page*.xml`, `sys_ui_macro*.xml`, `sp_widget*.xml`, `sys_ui_script*.xml`, and `.html`/UI files for tags that load external sources or frames: `<iframe>`, `<frame>`, `<frameset>`, `<embed src=...>`, `<video src=...>`, `<input src=...>`, or `<object data=...>`.
    - *Fix:* Remove `<iframe>` and external embed/object tags (`"If you can do it without an iframe, do it without an iframe"`), or document a valid business justification for certification security exception review and enforce strict `sandbox` and CSP headers.

12. **`glidescopedevaluator` — GlideScopedEvaluator** [P1] (Impact: High)
    - *Check:* Search server scripts for `GlideScopedEvaluator`. When present, verify all four requirements:
      1. Validate the source of the script
      2. Ensure write access to the script source field is restricted strictly to `admin` users
      3. Never build the evaluated script on the fly via string concatenation (Server-Side Injection risk)
      4. Never execute scripts provided by an untrusted 3rd party
    - *Fix:* Lock write ACLs on the script source field to `admin`, eliminate dynamic string concatenation in evaluated scripts, and validate script provenance.

13. **`ccfsa_acl` — Inappropriate ACLs on Client-Callable Flow, Subflow & Action** [P1] (Impact: High)
    - *Check:* Inspect `Flow()`, `Subflow()`, `Action()`, `sys_hub_flow*.xml`, and `sys_hub_action_type_definition*.xml` marked client-callable (`callable_by_client_api` / `callableByClientApi`). Verify a `sys_security_acl` of type `client_callable_flow_object` with `operation: 'execute'` and required roles exists.
    - *Fix:* Add a `client_callable_flow_object` ACL with the `execute` operation and required scoped roles for every client-callable Flow, Subflow, or Action.

14. **`Eval Used` — JavaScript `eval()` Function** [P1] (Impact: High)
    - *Check:* Scan client and server scripts (`sys_ui_page`, `sys_ui_macro`, `sp_widget`, `catalog_script_client`, `sys_ui_action`, `sys_script_include`, `sys_script_client`, `sys_script`, `sys_ui_script`, `sys_ws_operation`, `sys_transform_entry`, `sys_ui_policy`, and `.now.ts`/`.ts`/`.js`) for `eval(`, `new Function(`, or string-evaluated `setTimeout(`/`setInterval(`.
    - *Fix:* Remove `eval()` and dynamic code evaluation; use `JSON.parse()` or safe structured logic.

15. **`open_redirections` — Open Redirections ⚑** [P1] (Impact: High | CVSS: 8)
    - *Check:* Scan `sys_ui_page`, `sys_ui_macro`, `sp_widget`, `sys_ui_action`, `sys_script_client`, `sys_ui_script`, and `.ts`/`.js`/`.html` files for redirect sinks (`window.open`, `window.location.href`, `action.setRedirectURL(`, `gs.setRedirect(`, `document.location.href`, `top.location`, `self.location` — excluding `action.setRedirectURL(current)`) that consume unvalidated URL parameters, `sysparm_*`, or Jelly variables (KB0010052).
    - *Fix:* Validate redirect URLs against a strict allowlist / `glide.security.url.whitelist`, use relative in-instance paths, and never pass unvalidated query or Jelly parameters into redirect methods.

16. **`procrossor_integration` — Processor as Integration End Point ⚑** *(Legacy)* [P2] (Impact: High)
    - *Check:* Inspect `sys_processor*.xml` records to determine whether a Processor is used as an inbound integration endpoint (especially when `require_csrf` is `false`).
    - *Fix:* Replace the Processor with a Scripted REST API (`RestApi()`). If a Processor must be retained for legacy integration, document creating a `"Web service access only"` integration user in the Installation Guide, store the username in a system property, and enforce `if (gs.getUserName() != gs.getProperty('<integration_user_prop>'))` at the start of the Processor script.

17. **`processor_csrf` — Processor Vulnerable to CSRF** *(Legacy)* [P1] (Impact: High)
    - *Check:* Inspect `sys_processor*.xml` records for `<require_csrf>false</require_csrf>` or `<require_csrf>0</require_csrf>`.
    - *Fix:* Set `<require_csrf>true</require_csrf>` on every Processor record, or migrate to a Scripted REST API.

18. **`rca_target_scope_mismatch` — RCA Scope Not Matching Target App Scope** [P1] (Impact: High)
    - *Check:* Inspect `sys_restricted_caller_access*.xml`, `sys_scope_privilege*.xml`, and `CrossScopePrivilege()` records. Verify that no Real RCA (`sys_restricted_caller_access`) targeting another scope is packaged inside the source app's scope (`sys_scope != target_scope`), and that `CrossScopePrivilege` `target_scope` accurately matches the target artifact's owning scope.
    - *Fix:* Ensure `target_scope` matches the target resource's actual owning scope, remove self-approved foreign `sys_restricted_caller_access` records from the package, and if the target has `"Caller Restriction"`, document manual admin approval of the Real RCA in the Installation Guide (KB0010165).

19. **`si_restricted` — Restricted API Calls (`Packages.*`) ⚑** [P1] (Impact: High)
    - *Check:* Scan server scripts (`sys_ws_operation`, `sysauto_script`, `sys_script_include`, `sys_processor`, `sys_script`, `sys_script_fix`, and server `.now.ts`/`.ts`/`.js` — excluding MID Server Script Includes in `ecc_agent_script_include`) for Java `Packages.*` calls (`Packages.`).
    - *Fix:* Replace blocked `Packages.*` calls with supported Scoped GlideScriptable APIs (ignore hits inside `ecc_agent_script_include` MID Server Script Includes).

20. **`found_scheduled_email` — Scheduled Email of Reports / Workflow / Flow / Job** [P1] (Impact: High)
    - *Check:* Inspect `sysauto_report*.xml`, `sysauto_script*.xml`, `wf_workflow_schedule*.xml`, scheduled `sys_hub_flow*.xml` / `Flow()`, and `sysauto*.xml` (`ScheduledScript()`) that send automated reports, emails, or outbound telemetry without a conditional opt-in system property check.
    - *Fix:* Make scheduled reports, emails, and outbound jobs conditional on an opt-in system property (`false` by default) so data is only transmitted with explicit customer consent.

21. **`scripted_rest_acl_configuration` — Scripted REST Resources Security ⚑** [P1] (Impact: High)
    - *Check:* Inspect `RestApi()` routes and `sys_ws_operation*.xml` + parent `sys_ws_definition*.xml`. Verify that:
      1. `requires_authentication` (`requiresAuthentication`) is `true`
      2. `requires_acl_authorization` (`requiresAclAuthorization`) is `true`
      3. `enforce_acl` (`enforceAcl`) is populated on the operation or parent definition, and every referenced `REST_Endpoint` ACL has at least one `sys_security_acl_role` mapping.
    - *Fix:* Enable authentication and ACL authorization on all Scripted REST operations and attach a `REST_Endpoint` ACL with scoped roles.

22. **`senstive_data_exposed` — Sensitive Data Exposure ⚑** [P1] (Impact: High)
    - *Check:* Inspect `Property()` and `sys_properties*.xml` for sensitive settings (e.g., `password`, `secret`, `token`, `api_key`, `client_secret`) stored in clear-text `string` properties instead of `password2`, and check scripts for secrets written to `g_scratchpad` or system logs (`gs.info`, `gs.debug`, `gs.warn`, `gs.error`).
    - *Fix:* Use `password2` system properties (or Connections & Credentials `sys_alias`) for sensitive values and never expose secrets in `g_scratchpad` or logs.

23. **`sensitive_data_found` — Sensitive Data Found Against Artifacts ⚑** [P0] (Impact: High)
    - *Check:* Scan all artifacts — scripts, code comments (KB0010073), `sys_properties`, REST headers, and XML payloads — for hardcoded tokens, API keys, passwords, `Bearer`/`Basic` auth headers, private keys (`-----BEGIN`), session cookies (`JSESSIONID=`), or private internal IPs/URLs.
    - *Fix:* Clear out hardcoded credentials/tokens from all fields, scripts, and comments; manage credentials via Connections & Credentials (`sys_alias`) or blank `password2` properties.

24. **`thirdparty_lib` — Third-Party Libraries ⚑** [P2] (Impact: High)
    - *Check:* Scan `sys_ui_page*.xml`, `sys_ui_macro*.xml`, `sp_widget*.xml`, `sys_ui_script*.xml`, `sp_dependency*.xml`, `.html` files (`/script\s*(?=\bsrc\b|\btype\b)/i`), and `package.json` for external `<script src="...">` tags or bundled third-party JavaScript libraries (e.g., jQuery, AngularJS, Lodash, Moment, Bootstrap) with known CVEs (KB0010053).
    - *Fix:* Upgrade third-party JS libraries to current patched versions, remove unused vendor bundles, and ensure any external script references are vetted and integrity-checked.

25. **`ui_action_roles_condtions` — UI Action Security** [P1] (Impact: High)
    - *Check:* Inspect `UiAction()` and `sys_ui_action*.xml` + `sys_ui_action_role*.xml`. Flag UI Actions where no required roles (`sys_ui_action_role` / `roles`) are defined **and** `condition` is empty (or does not check `gs.hasRole` / record access permissions), allowing any logged-in user to invoke the action.
    - *Fix:* Restrict every UI Action by adding required roles (`sys_ui_action_role` / `roles`) and/or a restrictive `condition` expression.

26. **`postmessage_security` — `postMessage()` Security ⚑** [P1] (Impact: High)
    - *Check:* Scan `sys_ui_page`, `sys_ui_policy`, `sys_ui_macro`, `sp_widget`, `catalog_script_client`, `sys_ui_action`, `sys_script_include`, `sys_script_client`, `sys_ui_script`, and `.ts`/`.js`/`.html` files for `.postMessage(` calls (especially with wildcard `'*'` `targetOrigin` or sensitive payload data) and `addEventListener('message'` listeners missing `event.origin` validation (KB0010057).
    - *Fix:* Specify an explicit trusted `targetOrigin` in `postMessage()`, validate `event.origin` against a strict allowlist in `message` event handlers, and never send sensitive data via `postMessage()`.
