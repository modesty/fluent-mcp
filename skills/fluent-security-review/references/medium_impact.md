# Medium Impact Security Checks (25)

Items that secure the application's own scoped data, endpoints, UI components, and access controls.

1. **`sensitive_column_of_type_string` — Sensitive Column Using `string` Type** [P0]
   - *Check:* Inspect `Table()` columns and `sys_dictionary*.xml` for column names like `password`, `secret`, `token`, `api_key`, or `client_secret` typed as `string`.
   - *Fix:* Deactivate/remove the `string` column and recreate it with type `password2`.
2. **`senstive_data_exposed` — Clear-Text Sensitive Data Storage** [P1]
   - *Check:* Check if sensitive values are stored in clear-text properties, `g_scratchpad`, client state, or logs (`gs.info`/`gs.log`).
   - *Fix:* Store secrets in `password2` system properties or `encrypted_text` fields and never log or expose them to the client.
3. **`table_acl` — Missing CRUD ACLs on Scoped Tables** [P1]
   - *Check:* For every custom `Table()` or `sys_db_object*.xml`, verify `Acl()` / `sys_security_acl*.xml` records exist for `create`, `read`, `write`, and `delete` operations with scoped roles.
   - *Fix:* Create `record` ACLs covering `create`, `read`, `write`, and `delete` with appropriate application roles for each custom table.
4. **`scripted_rest_acl_configuration` — Scripted REST API Authentication & ACLs** [P1]
   - *Check:* Inspect `RestApi()` (`service_id`, routes) and `sys_ws_definition*.xml` / `sys_ws_operation*.xml` for `requires_authentication=false` or empty `enforce_acl`.
   - *Fix:* Enable `requires_authentication: true` and attach a `REST_Endpoint` ACL with required roles on every Scripted REST API and resource.
5. **`ccsi_acl` — Missing ACL on Client-Callable Script Include** [P1]
   - *Check:* Find `ScriptInclude({ clientCallable: true })` or `sys_script_include*.xml` with `<client_callable>true</client_callable>`. Verify a `client_callable_script_include` `execute` ACL with roles exists.
   - *Fix:* Add a `client_callable_script_include` ACL (`operation: 'execute'`) with required roles, and use `GlideRecordSecure` inside all methods.
6. **`ccfsa_acl` — Missing ACL on Client-Callable Flow, Subflow, or Action** [P1]
   - *Check:* Inspect `Flow()`, `Subflow()`, `Action()`, or `sys_hub_flow*.xml` / `sys_hub_action_type_definition*.xml` marked client-callable.
   - *Fix:* Add a `client_callable_flow_object` ACL with `execute` operation and required roles.
7. **`acl_on_agentic_ai_partner` — Missing ACL on AI Agent** [P1]
   - *Check:* Inspect `AiAgent()` (`sn_aia_agent`) definitions for role restrictions (`roleMap` / `acl` / `sys_security_acl`).
   - *Fix:* Define ACLs and least-privilege role restrictions on every AI Agent so only authorized users and data are accessible.
8. **`acl_on_agentic_ai_usecase_partner` — Missing ACL on AI Use Case / Workflow** [P1]
   - *Check:* Inspect `AiAgenticWorkflow()` (`sn_aia_usecase`) definitions for ACLs and role mappings.
   - *Fix:* Add ACLs with least-privilege roles to restrict who can trigger or access each AI Use Case.
9. **`acl_on_gen_ai_skill_partner` — Missing ACL on Gen AI / NASK Skill** [P1]
   - *Check:* Inspect `NowAssistSkillConfig()` (`sn_nowassist_skill_config`) for ACLs and `roleMap` restrictions.
   - *Fix:* Configure ACLs and `roleMap` with only the minimum required roles on every NASK skill.
10. **`ui_page_acl` — Missing Read ACL on UI Page** [P1]
    - *Check:* For every `UiPage()` or `sys_ui_page*.xml`, verify a `ui_page` `read` ACL exists on the endpoint name (without `.do`) secured by role.
    - *Fix:* Create a `read` ACL of type `ui_page` targeting the UI Page endpoint and assign required roles.
11. **`ui_action_roles_condtions` — Unprotected UI Action** [P1]
    - *Check:* Inspect `UiAction()` and `sys_ui_action*.xml` for records where both `condition` is empty and no required roles (`roles` / `sys_ui_action_role`) are defined.
    - *Fix:* Add required roles and/or a restrictive condition to every UI Action.
12. **`wg_glidereccalls` — `GlideRecord` Used Instead of `GlideRecordSecure`** [P2]
    - *Check:* Inspect server scripts invoked from client/user contexts (Scripted REST, CCSI, SP Widgets, UI Pages, UI Actions) that use `new GlideRecord(`.
    - *Fix:* Replace `GlideRecord` with `GlideRecordSecure` (or enforce `canRead()`/`canWrite()`/`canCreate()`/`canDelete()`) in user-triggered code paths.
13. **`public_pages` — Public Pages (`sys_public`)** [P2]
    - *Check:* Check for any `sys_public*.xml` or `Record({ table: 'sys_public' })` entries exposing UI pages or tables without login.
    - *Fix:* Remove `sys_public` records and protect pages with authenticated roles unless an approved business justification exists.
14. **`sp_public_page` — Service Portal Public Page** [P2]
    - *Check:* Inspect `SPPage()` or `sp_page*.xml` for `public: true` (`<public>true</public>`).
    - *Fix:* Set `public` to `false` on Service Portal pages and secure them with roles.
15. **`sp_page_role` — Service Portal Page Without Roles** [P2]
    - *Check:* Inspect `SPPage()` or `sp_page*.xml` for empty `roles`.
    - *Fix:* Assign appropriate application roles to the `roles` field on every Service Portal page.
16. **`sp_widget_public` — Service Portal Public Widget** [P2]
    - *Check:* Inspect `SPWidget()` or `sp_widget*.xml` for `public: true` (`<public>true</public>`).
    - *Fix:* Set `public` to `false` on Service Portal widgets.
17. **`sp_widget_role` — Service Portal Widget Without Roles** [P2]
    - *Check:* Inspect `SPWidget()` or `sp_widget*.xml` for empty `roles`.
    - *Fix:* Assign appropriate application roles to the `roles` field on every Service Portal widget.
18. **`role_applet_launcher` — Mobile Applet Launcher Missing Roles** [P1]
    - *Check:* Inspect `sys_sg_applet_launcher*.xml` for empty `roles` (allows any logged-in user access).
    - *Fix:* Populate the `roles` field on every Mobile Applet Launcher with scoped roles.
19. **`role_applet` — Mobile Applet Missing Roles** [P2]
    - *Check:* Inspect `sys_sg_screen*.xml` (Applets) for empty `roles`.
    - *Fix:* Populate the `roles` field on every Mobile Applet with scoped roles.
20. **`mob_agent_functions_security` — Mobile Agent Function Missing Role/Condition** [P2]
    - *Check:* Inspect `sys_sg_button*.xml` (Mobile Functions) where both `condition` and `roles` are empty.
    - *Fix:* Add required `roles` and/or a `condition` to every Mobile Function.
21. **`jelly_unescaped` — Unsafe / Unescaped Jelly Statements (XSS)** [P1]
    - *Check:* Search `sys_ui_page*.xml`, `sys_ui_macro*.xml`, and Jelly templates for unescaped `${...}` or `$[...]` expressions, `<g:no_escape>`, or `NOESC` on user/DB data (KB0010051).
    - *Fix:* Escape Jelly outputs using `${HTML:var}`, `${JS:var}`, or `<j:out value="..." />` and remove `<g:no_escape>`.
22. **`postmessage_security` — `postMessage()` Origin & Data Exposure** [P1]
    - *Check:* Search client scripts, UI pages, and SP widgets for `postMessage(` with wildcard `'*'` targetOrigin, `addEventListener('message'` without `event.origin` verification, or sensitive payload data (KB0010057).
    - *Fix:* Specify an exact `targetOrigin` in `postMessage()`, verify `event.origin` against a strict allowlist in listeners, and never transmit secrets.
23. **`open_redirections` — Unvalidated Open Redirections** [P1]
    - *Check:* Search for redirects (`window.location`, `document.location.href`, `gs.setRedirect`, `action.setRedirectURL`) using unvalidated URL parameters or Jelly variables (KB0010052).
    - *Fix:* Validate redirect targets against `glide.security.url.whitelist`, require user confirmation for external links, and disallow dynamic `javascript:` or external URLs.
24. **`processor_acl` — Legacy Processor Missing Execute ACL** *(Legacy — Processors deprecated since Madrid)* [P1]
    - *Check:* If `sys_processor*.xml` exists, verify a `processor` `execute` ACL with roles is defined.
    - *Fix:* Migrate to a Scripted REST API, or add an `execute` ACL with scoped roles for the processor.
25. **`processor_csrf` — Legacy Processor Missing CSRF Protection** *(Legacy — Processors deprecated since Madrid)* [P1]
    - *Check:* If `sys_processor*.xml` exists, check if `<csrf_protect>true</csrf_protect>` is set.
    - *Fix:* Enable `csrf_protect` on the processor, or migrate to a Scripted REST API.
