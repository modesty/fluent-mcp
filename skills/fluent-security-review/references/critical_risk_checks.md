# Critical Risk Security Checks

Security checks classified as **Critical** risk for ServiceNow scoped applications.

1. **`acl_with_nobody_or_public_role` — ACL with Nobody/Public Role** [P0] (Impact: Critical | CVSS: 5)
   - *Check:* Inspect `Acl()` definitions (`roles: [...]`), `sys_security_acl*.xml`, and `sys_security_acl_role*.xml` (`display_value="nobody"` / `display_value="public"`, or `nobody` role `sys_id` `b05926fa0a0a0aa7000130023e0bde98` / `public` role `sys_id` `940ba7020a0a0aa70065066690d815c6`). Applying `nobody` can irreversibly lock important system functions even for admins; applying `public` removes the requirement to log in.
   - *Fix:* Remove `nobody` and `public` roles from all ACLs and `sys_security_acl_role` mappings; restrict access using scoped application roles.

2. **`script_type_column` — Column of Type Script Field ⚑** [P0] (Impact: Critical | CVSS: 1.2)
   - *Check:* Inspect `Table()` columns (`ScriptColumn` or `GenericColumn` with `columnType: 'script' | 'script_plain' | 'script_server'`) and `sys_dictionary*.xml` / `dictionary/*.xml` (`internal_type` of `script`, `script_plain`, or `script_server`). Script-type fields allow server-side script execution and can compromise the customer instance if writable by non-admin users.
   - *Fix:* Secure write/create ACLs on any `script`-type field strictly to `admin` users (or remove the script-type column if arbitrary server script evaluation is not required).

3. **`idor` — Insecure Direct Object Reference (IDOR)** [P0] (Impact: Critical)
   - *Check:* Inspect client-reachable entry points — Scripted REST APIs (`RestApi()`, `sys_ws_operation`), Client-Callable Script Includes (`ScriptInclude({ clientCallable: true })`), UI Pages (`UiPage()`, `sys_ui_page`), Service Portal Widgets (`SPWidget()`, `sp_widget`), UI Actions, and Processors — where user-supplied parameters (`request.pathParams`, `request.queryParams`, `request.body`, `this.getParameter()`, `input.*`, `g_request.getParameter()`) are passed into `GlideRecord` queries/updates/deletes without record-level ACL or ownership checks (KB0010075).
   - *Fix:* Enforce server-side authorization and record ownership checks using `GlideRecordSecure` or explicit `canRead()` / `canWrite()` / `canCreate()` / `canDelete()` guards before reading or mutating records.

4. **`manual_security_review` — Manual Security Review (JARVIS & Application Files) ⚑** [P0] (Impact: Critical)
   - *Check:* Perform a deep static security review across application files for high-risk platform vectors tracked by JARVIS:
     - `GlideEvaluator`, `GlideScriptEvaluator`, `GlideFilter`, or `GlideController` invoked with untrusted/user-controlled input
     - `setDisplayValue()` called on `password` or `password2` fields (stores credentials in clear text instead of encrypting)
     - Deprecated `GlideEncrypter` (3DES) usage instead of KMF (`sn_kmf_ns`) or `CertificateEncryption`
     - Unencrypted `http://` external integration endpoints in `RestMessage()` / `sys_rest_message` / scripts (KB0010088)
     - `Math.random()` used to generate passwords, tokens, nonces, or security-sensitive secrets (KB0010151)
     - Flows or Flow Actions invoked by AI Agents that lack `flow` / `flow_action` ACLs with operation `invoke_from_ai` and the `UserIsAuthenticated` (`23990b990b2132005759c71437673a34`) security attribute (KB0010250)
   - *Fix:* Replace `GlideEvaluator` with safe structured logic; use `setValue()` on `password2` columns; use KMF instead of `GlideEncrypter`; enforce `https://` on all external endpoints; use `GlideSecureRandomUtil` for cryptographic randomness; and define `invoke_from_ai` ACLs with `UserIsAuthenticated` on AI-invoked flows and actions.

5. **`password_properties` — Password Properties** [P0] (Impact: Critical)
   - *Check:* Inspect `Property()` (`type: 'password'` or `'password2'`) in `.now.ts` and `sys_properties*.xml` where `<type>` contains `password` (`password` or `password2`) and `<value>` is non-empty.
   - *Fix:* Set the `value` field to blank (`""` / `<value/>`) on every `password` and `password2` system property record packaged with the application.

6. **`role_applet_launcher` — Roles on Applet Launcher** [P1] (Impact: Critical)
   - *Check:* Inspect `sys_sg_applet_launcher*.xml` (and `Record({ table: 'sys_sg_applet_launcher' })`) for an empty `<required_roles>` field. If no roles are selected in `required_roles`, users with any role can access the mobile application launcher.
   - *Fix:* Populate `<required_roles>` on every `sys_sg_applet_launcher` record with the appropriate scoped application roles.

7. **`sensitive_column_of_type_string` — Sensitive Column of Type String** [P0] (Impact: Critical)
   - *Check:* Inspect `Table()` columns (`StringColumn`) and `sys_dictionary*.xml` / `dictionary/*.xml` (`internal_type` = `string`) for column names that store credentials or secrets (e.g., `password`, `passwd`, `pwd`, `secret`, `client_secret`, `api_key`, `apikey`, `access_token`, `refresh_token`, `auth_token`, `private_key`, `passphrase`), which expose sensitive data in clear text.
   - *Fix:* Deactivate/remove the existing `string`-type field and create a new column of type `password2` (`Password2Column` / `GenericColumn({ columnType: 'password2' })`).
