# Scripting Best-Practice Checks (15)

Server-side GlideScript (`GlideRecord`, `GlideSystem`, Read ACL scripts, Workflow scripts) and Client-side Browser scripts (`GlideAjax`, `g_form`, `onChange`).

1. **`script_logs` — Disallowed `gs.log()` in Scoped Server Scripts / `console.log()` in Client Scripts** [P1 / P3] (Impact: Low)
   - *Check:* Scan server scripts (`.now.ts`, `.ts`, `.js`, and XML `<script>`, `<operation_script>`, `<processing_script>`) for `gs.log(`. In scoped applications (`ScopedGlideSystem`), `gs.log` is not on the scoped allowlist and throws a runtime error (`log is not allowed in scope`) [P1]. Also scan client scripts (`ClientScript()`, `CatalogClientScript()`, `<client_script>`) for `console.log(` [P3].
   - *Fix:* Replace `gs.log()` in scoped server scripts with `gs.info()`, `gs.debug()`, `gs.warn()`, or `gs.error()`. In client scripts, use `jslog()` instead of `console.log()`.

2. **`getXMLWait` — Synchronous `getXMLWait()` in Scoped Client Scripts** [P1] (Impact: Medium)
   - *Check:* Scan client scripts (`ClientScript()`, `CatalogClientScript()`, `UiPage()`, `SPWidget()`, `UiAction()`, `sys_script_client*.xml`, `catalog_script_client*.xml`, `sys_ui_page*.xml`, `sp_widget*.xml`, `sys_ui_script*.xml`) for `.getXMLWait(`. `getXMLWait()` is synchronous and unavailable in scoped applications (causes runtime failure).
   - *Fix:* Replace `ga.getXMLWait()` with asynchronous `ga.getXML(callback)` or `ga.getXMLAnswer(callback)`.

3. **`acl_script_no_gliderecord_aggregate` — Avoid `GlideRecord` and `GlideAggregate` in Read ACL Scripts** [P2] (Impact: Medium)
   - *Check:* Inspect `Acl({ operation: 'read', script: ... })` and `sys_security_acl*.xml` where `<operation>read</operation>` (or `operation="read"`). Verify the `script` block does not instantiate `new GlideRecord(`, `new GlideRecordSecure(`, or `new GlideAggregate(`. Read ACLs evaluate on every row in lists and reports; nested database queries cause severe scalability bottlenecks.
   - *Fix:* Refactor the Read ACL to use role checks, `SecurityAttribute` conditions, session/user properties (`gs.getUser()`), or dot-walked declarative `condition` filters instead of scripted `GlideRecord`/`GlideAggregate` queries.

4. **`get_row_count` — Avoid `getRowCount()` for Record Counting** [P2] (Impact: Medium)
   - *Check:* Search all server and client scripts for `.getRowCount(`. `GlideRecord.getRowCount()` streams and materializes all matching rows into memory to count them, degrading performance as tables grow.
   - *Fix:* Use `GlideAggregate` with `addAggregate('COUNT')` to count records at the database layer, `gr.hasNext()` when only checking existence, or increment a counter inside an existing `while (gr.next())` loop when already iterating rows.

5. **`get_function` — Unguarded `GlideRecord.get()` Call** [P2] (Impact: Medium)
   - *Check:* Find `GlideRecord` `.get(` calls in server scripts that are not enclosed in an `if (gr.get(...))` condition or assigned and checked before subsequent field reads/writes (`gr.update()`). Note: Ignore `GlideElement`/`g_form`/Map `.get()` calls; only flag `GlideRecord` instances where `.get()` is followed by unguarded record access or `.update()`.
   - *Fix:* Wrap `gr.get(...)` in a conditional check:
     ```javascript
     if (gr.get(recordSysId)) {
       gr.setValue('short_description', 'Updated');
       gr.update();
     }
     ```

6. **`occurence_get_ref_record` — Unguarded `.getRefRecord()` Usage** [P2] (Impact: Medium)
   - *Check:* Search server scripts for `.getRefRecord()`. When a reference field is empty or broken, `getRefRecord()` still returns an uninitialized `GlideRecord` object without throwing; dereferencing fields or calling `.update()` without checking `.isValidRecord()` causes `undefined` errors or unintended updates.
   - *Fix:* Always guard the returned reference record with `if (refGr.isValidRecord()) { ... }` before reading or modifying fields, and verify the reference field targets the child table if accessing child-table columns.

7. **`gr_as_variable_name` — Unwrapped or Colliding `'gr'` GlideRecord Variable Name** [P2] (Impact: Medium)
   - *Check:* Scan scripts for `gr = new GlideRecord(` (especially implicit globals missing `var`/`let`/`const` or unwrapped top-level scripts using `gr`, or inner loops reusing `gr` while an outer `gr` loop is active). Note: If `gr` is properly scoped (`const`/`let`/`var`) inside a function without variable shadowing/clobbering, treat it as a low-risk naming warning or false positive.
   - *Fix:* Wrap scripts in a function (`(function executeRule(current, previous) { ... })(current, previous);`), declare variables with `const`/`let`/`var`, and use descriptive table-specific variable names (e.g., `incidentGr`, `taskGr`) instead of `gr`.

8. **`GRcalls_on_sysapp` — `GlideRecord` Queries on `sys_app` Table** [P2] (Impact: Medium)
   - *Check:* Search server scripts for `new GlideRecord('sys_app')` or `new GlideRecord("sys_app")`. Once a scoped app is installed from the ServiceNow Store on a customer instance, its record resides in `sys_store_app` (or `sys_scope`), not `sys_app` (which only holds studio/in-development apps).
   - *Fix:* Avoid querying `sys_app` at runtime; use system properties (`gs.getProperty()`), `gs.getCurrentApplicationId()`, or query `sys_store_app` / `sys_scope` if package metadata is genuinely required.

9. **`hardcoded_data` — Hardcoded `sys_id`s or Environment URLs in Scripts** [P2 / P3] (Impact: Medium)
   - *Check:* Scan scripts for hardcoded 32-character hex `sys_id` literals (`/[0-9a-f]{32}/i`) that do not belong to records packaged in the app (`Now.ID`, `metadata/`, `update/`) or known baseline constants [P2], as well as hardcoded environment URLs (`http://`, `https://`) embedded directly in code [P3].
   - *Fix:* Reference packaged records via `Now.ID[...]` or look up customer records dynamically by unique name/code or a system property (`gs.getProperty('x_scope.endpoint_url')`).

10. **`wf_recursive` — Recursive `current.update()` in Workflow Script** [P2] (Impact: Medium)
    - *Check:* Inspect workflow scripts (`wf_workflow_version*.xml`, `sys_variable_value*.xml` for workflow `run_script` activities) for `current.update()`. Calling `current.update()` inside a workflow script re-triggers business rules and workflow engines, risking infinite recursion on insert or double execution on update.
    - *Fix:* Remove `current.update()` from workflow script activities and use standard Set Values workflow activities or Flow Designer `updateRecord` actions.

11. **`get_reference` — `g_form.getReference()` in Client Scripts** [P2] (Impact: Low)
    - *Check:* Scan client scripts (`ClientScript()`, `CatalogClientScript()`, `sys_script_client*.xml`, `catalog_script_client*.xml`, `sp_widget*.xml`, `sys_ui_page*.xml`) for `g_form.getReference(`. Calling `getReference()` without a callback runs synchronously, and even with a callback it serializes the entire referenced record across the network when only one or two fields are needed.
    - *Fix:* Replace `g_form.getReference()` with `g_scratchpad` (populated by a `display` Business Rule) or an asynchronous `GlideAjax` call that returns only the required fields. If `getReference` must be used, always supply an asynchronous callback function as the second argument.

12. **`cs_best_practise` — Missing `isLoading` Guard in `onChange` Client Script** [P3] (Impact: Low)
    - *Check:* Inspect `onChange` Client Scripts (`ClientScript({ type: 'onChange' })`, `CatalogClientScript({ type: 'onChange' })`, `sys_script_client*.xml` with `<type>onChange</type>`) to check whether they guard against form-load execution (`if (isLoading)` or `if (isLoading || newValue === '') return;`).
    - *Fix:* Add an `if (isLoading || newValue === '') { return; }` guard at the start of `onChange` scripts unless the script intentionally initializes form state on load.

13. **`client_side_operations` — Prefer Declarative UI Policy Over Client Script** [P3] (Impact: Low)
    - *Check:* Inspect `ClientScript()` / `sys_script_client*.xml` and `UiPolicy()` with `runScripts: true` / `sys_ui_policy*.xml` that only call `g_form.setMandatory()`, `g_form.setReadOnly()`, `g_form.setDisabled()`, `g_form.setVisible()`, or `g_form.setDisplay()` without complex logic or server lookups.
    - *Fix:* Consider replacing simple imperative `g_form` visibility/mandatory/read-only scripts with declarative `UiPolicy()` (`sys_ui_policy` + `sys_ui_policy_action`) definitions.

14. **`cross_scope_crud` — Cross-Scope CRUD & CMDB IRE Compliance** *(Legacy / Platform-Enforced)* [P4 / P2] (Impact: Medium)
    - *Check:* Check if scripts perform direct `.insert()`, `.update()`, `.deleteRecord()`, or `.deleteMultiple()` on `cmdb_ci` (or its child tables) instead of using the CMDB Identification and Reconciliation Engine (`sn_cmdb.IdentificationEngine` / `createOrUpdateCI`) [P2]. (Note: General cross-scope table CRUD permissions are enforced at runtime by Application Access / RCA fencing [P4]).
    - *Fix:* Route all CMDB CI create/update operations through the CMDB IRE API (`sn_cmdb.IdentificationEngine.createOrUpdateCI(discoverySource, payload)`) and declare required `CrossScopePrivilege` records for cross-scope table access.

15. **`gr_on_system_tables` — `GlideRecord` CRUD on Restricted System Tables (`sys_email`)** *(Legacy / Platform-Enforced)* [P4] (Impact: Medium)
    - *Check:* Search server scripts for direct `new GlideRecord('sys_email')` create/update/delete operations. (Note: Enforced at runtime by scoped table fencing on modern family releases).
    - *Fix:* Use standard `EmailNotification()` (`sysevent_email_action`) or `gs.eventQueue()` rather than directly inserting or mutating `sys_email` records via `GlideRecord`.
