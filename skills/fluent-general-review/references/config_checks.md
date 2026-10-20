# Configuration Best-Practice Checks (16)

Declarative table/schema footprint on OOB tables, custom roles, package dependencies, scheduled jobs, Transform Maps, CMDB Discovery sources, PA, HR, Workflow approvers, and UX modules.

1. **`ootb_table_extension` — Extending Prohibited Core OOTB ITSM Tables** [P1] (Impact: Critical)
   - *Check:* Inspect `Table({ extends: ... })` in `.now.ts` and `<super_class>` in `sys_db_object*.xml` / `dictionary/*.xml`. Verify no custom scoped table directly extends `incident`, `problem`, `change_request`, `sc_req_item` (Requested Item), or `sc_task` (Catalog Task).
   - *Fix:* Extend `task` (or create a standalone table / relationship) instead of extending `incident`, `problem`, `change_request`, `sc_req_item`, or `sc_task`.

2. **`column_created_on_oob_table` — Custom Columns Added to Shared OOB Tables** [P2] (Impact: High)
   - *Check:* Inspect `Table()` augmentations (where table name does not start with `<scope>_`), `sys_dictionary*.xml`, and `dictionary/*.xml` for custom columns created on out-of-the-box tables (e.g., `cmdb_ci`, `sp_page`, `sys_user`, `task`).
   - *Fix:* Avoid adding columns directly to shared OOB tables where possible; prefer a scoped extension/companion table with a reference field, or document the business justification and verify every augmented column uses the `<scope>_` prefix.

3. **`artifacts_created_on_oob_table` — Application Artifacts Targeting OOB Tables** [P4] (Impact: Low)
   - *Check:* Inventory packaged Business Rules (`BusinessRule()`), Client Scripts (`ClientScript()`), UI Actions (`UiAction()`), UI Policies (`UiPolicy()`), and Data Policies targeting out-of-the-box tables (tables not prefixed with `<scope>_`).
   - *Fix:* Ensure all artifacts on OOB tables have narrow `condition` guards, do not break baseline OOB functionality, and are documented in the app's customization disclosure.

4. **`custom_role_on_oob_role` — Custom Roles Containing System / Out-of-Scope Roles** [P2] (Impact: Medium)
   - *Check:* Inspect `Role({ containsRoles: [...] })` in `.now.ts` and `sys_user_role_contains*.xml`. Flag any contained role whose name does not start with the application's `<scope>.` prefix (or where `<contains>` is empty/unresolved), as OOB plugin roles may not exist on all customer instances and grant unintended platform privileges.
   - *Fix:* Remove system/OOB roles from `containsRoles` (`sys_user_role_contains`) and document optional role inheritance in the post-installation guide for customer admins to assign if needed.

5. **`optioanalDependenciesUsed` — Optional Plugin/App Dependencies Used Without Guards** [P3] (Impact: High)
   - *Check:* Inspect `package.json`, `now.config.json`, `sys_app_*.xml`, and `sys_store_app_*.xml` for optional plugin/application dependencies, or artifacts referencing optional plugin tables/APIs.
   - *Fix:* Ensure optional dependencies are clearly declared and guard any code paths invoking optional plugins with `GlidePluginManager.isActive('<plugin_id>')` so the app degrades gracefully when the plugin is absent.

6. **`scheduled_job_run_as` — Scheduled Job `'Run As'` Referencing Specific User** [P2] (Impact: Low)
   - *Check:* Inspect `ScheduledScript()` and `sysauto*.xml` (`sysauto_script`, `sysauto_report`, `sys_trigger`) for a non-empty `run_as` (`<run_as>`) user reference. A hardcoded user `sys_id` in `run_as` will point to a non-existent user record on customer instances.
   - *Fix:* Leave the `run_as` field empty on packaged Scheduled Jobs so they run as `system` by default (or bind a customer-configured service account post-install).

7. **`default_dynamic_translation` — Dynamic Translation Configuration Marked as Default or Active** [P2] (Impact: High)
   - *Check:* Inspect `sys_translator_configuration*.xml` or `Record({ table: 'sys_translator_configuration' })`. Flag any record where `default_provider` (`mark_as_default_for_translation` / `mark_as_default_for_detection`) is `true` or `active` is `true`, which overrides the customer's existing translation provider upon installation.
   - *Fix:* Set `default_provider`, `default_detector`, and `active` to `false` on packaged `sys_translator_configuration` records so customers explicitly opt in after installation.

8. **`tm_boolean_fields_check` — Boolean Fields on Import Set Tables in Transform Maps** [P2] (Impact: Medium)
   - *Check:* Inspect Import Set tables (`ImportSet()`, tables extending `sys_import_set_row` in `sys_db_object*.xml` / `sys_dictionary*.xml`) and `sys_transform_entry*.xml`. Check if any staging column has `internal_type` `boolean` (`BooleanColumn`). Because boolean columns default to `false` and are never empty, a Transform Map with `copy_empty_fields=false` will still overwrite target boolean fields to `false` when the input payload omits the field.
   - *Fix:* Change the staging column on the Import Set table from `boolean` (`True/False`) to `string` (`StringColumn`) and use a transform script to map `'true'`/`'false'` only when the source value is explicitly provided.

9. **`discovery_source_choice` — CMDB Discovery Source Choice Registration** [P2] (Impact: Medium)
   - *Check:* If the application inserts or updates `cmdb_ci` records (via IRE `createOrUpdateCI` or CMDB APIs), verify the app registers its own custom `discovery_source` choice on `cmdb_ci` (typically via `CMDBDataSourceUtil().addDataSource('<AppName>')` or a `sys_choice` record for `cmdb_ci.discovery_source`) rather than reusing OOB discovery source values (`ServiceNow`, `ServiceWatch`, etc.).
   - *Fix:* Register a dedicated discovery source name matching your application via `new global.CMDBDataSourceUtil().addDataSource('<AppScopeOrName>')` and pass that source name to CMDB IRE calls.

10. **`wf_invalid_approvers` — Static User/Group Approvers in Workflows** [P2] (Impact: Medium)
    - *Check:* Inspect `wf_activity*.xml` / `sys_variable_value*.xml` (approval user/group activities) and `Flow()` approval actions for hardcoded user or group `sys_id`s that may be inactive or missing on customer instances.
    - *Fix:* Resolve approvers dynamically from record fields (e.g., ` requested_for.manager`, assignment group) or system properties rather than hardcoding instance-specific user/group `sys_id`s.

11. **`element_filter` — PA Breakdown Element Filter with Invalid Query** [P2] (Impact: High)
    - *Check:* Inspect Performance Analytics Breakdown Element Security Lists / Filters (`pa_dimension_security_list*.xml`, `sys_filter*.xml`) to ensure `<conditions>` is non-empty and does not reference deleted or non-existent columns on the target table.
    - *Fix:* Validate and update the encoded query condition on every Breakdown Element Filter so all referenced fields exist on the target table.

12. **`record_collection` — PA Indicator Criterion Referencing Indicator Without `Collect records`** [P2] (Impact: Medium)
    - *Check:* Inspect Performance Analytics indicator criteria and `pa_indicators*.xml`. If a criterion or drill-down feature references a PA indicator (`pa_indicators`), verify that `<collect_records>true</collect_records>` is enabled on that indicator.
    - *Fix:* Enable `collect_records: true` on the referenced `pa_indicators` record or remove the record-dependent criterion.

13. **`hr_pdf_map` — Active HR PDF Template Missing Field or Script Mapping** [P2] (Impact: Low)
    - *Check:* Inspect HR PDF document templates (`sn_hr_core_pdf_template*.xml`, `sn_hr_core_pdf_template_mapping*.xml`). Verify that every active HR PDF template has at least one corresponding field or script mapping record.
    - *Fix:* Add the required field/script mappings to active HR PDF templates or set `active` to `false` on unmapped templates.

14. **`support_module` — Contact Support Module & External Link `rel` Attributes** [P3] (Impact: Medium)
    - *Check:* Inspect `ApplicationMenu()` and `sys_app_module*.xml` to check whether a `Contact Support` (or `Support`) navigation module is included under the application menu. Also scan HTML/UI Pages/Widgets (`<a ... target="_blank">`) for external links missing `rel="noopener noreferrer nofollow"`.
    - *Fix:* Add a `Contact Support` module under the application menu with vendor support contact details, and add `rel="noopener noreferrer nofollow"` to external `<a target="_blank">` anchor tags.

15. **`hr_shell_template` — HR Service with Empty Shell HR Template** *(Legacy / Obsolete)* [P4] (Impact: Low)
    - *Check:* Inspect `sn_hr_core_service*.xml` and `sn_hr_core_template*.xml` for HR Services linked to an active HR Template with an empty `<template>` body (zero fields). *(Note: The platform `EcmaError` on empty shell templates was fixed in Quebec, so this check is informational on current family releases).*
    - *Fix:* Populate at least one field in the `<template>` field of the HR Template or unlink/deactivate unused shell templates.

16. **`homepage_order_read_role` — Legacy Homepage Order (`>= 3000`) & Read Roles** *(Legacy / Obsolete)* [P4] (Impact: Medium)
    - *Check:* Inspect `sys_portal_page*.xml` (legacy Homepages) for `<order>` less than `3000` or empty/`snc_internal` `<read_roles>`. *(Note: Legacy Homepages are deprecated in Next Experience).*
    - *Fix:* Set `<order>` to `3000` or higher and assign a scoped role to `<read_roles>` on any packaged `sys_portal_page`, or migrate legacy Homepages to Next Experience Dashboards (`Dashboard()`).
