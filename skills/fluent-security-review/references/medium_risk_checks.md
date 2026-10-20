# Medium Risk Security Checks

Security checks classified as **Medium** risk for ServiceNow scoped applications.

1. **`dynamic_input_add_encoded_query` — Dynamic Input in `addEncodedQuery()`** [P0] (Impact: Medium)
   - *Check:* Scan server scripts for `.addEncodedQuery(` where the query string is dynamically constructed from user-controllable parameters or stored record fields (e.g., `description`, `short_description`), enabling blind query injection and ACL bypass across tables (KB0010217).
   - *Fix:*
     - **Solution 1 (Preferred):** Replace `gr.addEncodedQuery(...)` with `gr.addQuery(field, value)` or `gr.addQuery(field, operator, value)`.
     - **Solution 2 (If Encoded Query is required):** Escape every dynamic value with `GlideStringUtil.escapeQueryTermSeparator(val)` **and** pass `true` as the second parameter (`BooleanEnforceACL`):
       ```javascript
       gr.addEncodedQuery(
         'categoryLIKE' + GlideStringUtil.escapeQueryTermSeparator(sysparm_category) + '^active=true',
         true
       );
       ```

2. **`fix_script` — Fix Script** [P0] (Impact: Medium)
   - *Check:* Inspect `sys_script_fix*.xml` (and any Fix Scripts) for record deletions (`deleteRecord()`, `deleteMultiple()`) or CRUD operations (`insert()`, `update()`, `deleteRecord()`, `deleteMultiple()`) on out-of-scope tables.
   - *Fix:* Remove Fix Scripts that delete records or perform CRUD operations on out-of-scope tables.

3. **`wg_glidereccalls` — `GlideRecord` for Table Operations** [P2] (Impact: Medium)
   - *Check:* Scan user/client-reachable server scripts (`sys_ui_page`, `sys_ui_macro`, `sp_widget`, `sys_ui_script`, `sys_ws_operation`, client-callable `sys_script_include`, and corresponding Fluent definitions) for `new GlideRecord(`. `GlideRecord` does not enforce ACLs unless `canRead()`/`canWrite()`/`canCreate()`/`canDelete()` is checked (KB0010075).
   - *Fix:* Use `GlideRecordSecure` (or explicitly guard operations with `canRead()` / `canWrite()` / `canCreate()` / `canDelete()`) whenever querying or mutating tables on behalf of a logged-in user.

4. **`mob_agent_functions_security` — Mobile Agent Function Security** [P2] (Impact: Medium)
   - *Check:* Inspect `sys_sg_button*.xml` (Mobile Functions) for empty `<roles>` (and empty `<condition>`), which allows any logged-in user to invoke the Mobile Function.
   - *Fix:* Restrict every Mobile Function (`sys_sg_button`) by configuring `<roles>` and/or a function `<condition>`.

5. **`public_pages` — Public Pages (`sys_public`)** [P2] (Impact: Medium)
   - *Check:* Inspect `sys_public*.xml` and `Record({ table: 'sys_public' })` records. Entries in `sys_public` make UI Pages or tables publicly accessible without login.
   - *Fix:* Remove `sys_public` records and protect pages with authenticated roles unless public unauthenticated access is strictly required and justified for certification review.

6. **`push_notification_install` — Push Notification Installations** [P3] (Impact: Medium)
   - *Check:* Check for any `sys_push_notif_app_install*.xml` (`Record({ table: 'sys_push_notif_app_install' })`) records captured in the application scope.
   - *Fix:* Delete all `sys_push_notif_app_install` records from the application package.

7. **`role_applet` — Roles on Applet** [P2] (Impact: Medium)
   - *Check:* Inspect `sys_sg_application*.xml` for an empty `<roles>` field, and inspect `sys_sg_screen*.xml` (Mobile Applets) for an empty `<roles_override>` (or `<roles>`) field. If no roles are selected, users with any role can access the applet.
   - *Fix:* Populate `<roles>` on `sys_sg_application` and `<roles_override>` on `sys_sg_screen` with the appropriate scoped application roles.

8. **`sp_page_role` — Service Portal Page Role** [P2] (Impact: Medium)
   - *Check:* Inspect `SPPage()` (`sp_page*.xml`) and `sys_portal_page*.xml` for an empty `roles` (`<roles/>`) field. Service Portal pages without roles are accessible to all logged-in users.
   - *Fix:* Protect every Service Portal page (`sp_page`) with appropriate scoped application roles in `roles`.

9. **`sp_public_page` — Service Portal Public Page** [P2] (Impact: Medium)
   - *Check:* Inspect `SPPage()` (`sp_page*.xml`) for `public: true` (`<public>true</public>` or `<public>1</public>`). Public Service Portal pages do not require login and can be accessed by anyone.
   - *Fix:* Set `public` to `false` on Service Portal pages and secure them with scoped roles (or document the business justification if public access is required).

10. **`sp_widget_public` — Service Portal Public Widget** [P2] (Impact: Medium)
    - *Check:* Inspect `SPWidget()` (`sp_widget*.xml`) for `public: true` (`<public>true</public>` or `<public>1</public>`). Public Service Portal widgets do not require login.
    - *Fix:* Set `public` to `false` on Service Portal widgets and secure them with scoped roles.

11. **`sp_widget_role` — Service Portal Widget Role** [P2] (Impact: Medium)
    - *Check:* Inspect `SPWidget()` (`sp_widget*.xml`) for an empty `roles` (`<roles/>`) field. Service Portal widgets without roles are accessible to all logged-in users.
    - *Fix:* Assign appropriate scoped application roles to the `roles` field on every Service Portal widget.

12. **`jelly_unescaped` — Unsafe Jelly Statements (XSS)** [P1] (Impact: Medium)
    - *Check:* Scan Jelly templates in `sys_ui_page*.xml` (`html`, `client_script`, `processing_script`), `sys_ui_macro*.xml` (`xml`), and Jelly `.html` files for unescaped `${...}` or `$[...]` expressions lacking `HTML:` / `JS:` / `JS,HTML:` / `HTML,JS:` prefixes (`/\$(?:\{|\[)(?!((js|html|(js,html)|(html,js)):|amp|sp|gs\.))/i`), `<g:no_escape>`, `<g2:no_escape>`, or `NOESC:` (KB0010051).
    - *Fix:* Escape all Jelly expressions using `${HTML:var}`, `${JS:var}`, `$[HTML:var]`, or `$[JS:var]`, and remove `<g:no_escape>` / `NOESC:`.
