# MSP Ready / Domain Separation Checks

> **Scope Note:** These 10 checks evaluate **MSP Ready (Domain Separation)** compliance for ServiceNow scoped applications. Checks 1–2 (`br_sys_domain`, `ui_action_sys_overrides`) enforce baseline package domain hygiene, while Checks 3–10 enforce multi-tenant data isolation, process override semantics, and domain assignment when `glide.sys.domain.partitioning` is active.

1. **`msp_getDefaultDomain_cross_scope` — Missing `'getDefaultDomain'` Cross-Scope Privilege** [P0] (Impact: Critical)
   - *Check:* Inspect `CrossScopePrivilege()` in `.now.ts` and `sys_scope_privilege*.xml` records. When an MSP-ready scoped application assigns records to the default domain (`global.getDefaultDomain()`), it must package an active `sys_scope_privilege` record with `target_name: 'getDefaultDomain'`, `target_scope: 'global'`, `target_type: 'scriptable'`, `operation: 'execute'`, and `status: 'allowed'`. Without this record, default-domain Business Rules fail at runtime on MSP instances.
   - *Fix:* Add a `CrossScopePrivilege` record for `global.getDefaultDomain`:

     ```typescript
     CrossScopePrivilege({
       $id: Now.ID['csp_get_default_domain'],
       targetName: 'getDefaultDomain',
       targetScope: 'global',
       targetType: 'scriptable',
       operation: 'execute',
       status: 'allowed',
     })
     ```

2. **`msp_Import_set_tables` — Import Set Tables and Associated Roles Must Restrict Tenant Access** [P1] (Impact: High)
   - *Check:* Find all tables extending `sys_import_set_row` (`Import Set Row`). Because Import Set staging tables are **not** domain-separated (`sys_domain` is absent), any tenant user with read/write access to an Import Set table can view or tamper with other tenants' staged integration data. Verify that the roles governing ACLs and modules for these Import Set tables are dedicated integration/admin roles and are **not** granted to tenant user roles.
   - *Fix:* Restrict all `sys_import_set_row` child tables with dedicated admin/integration roles and ensure those roles are not contained within tenant-facing roles.

3. **`br_sys_domain` — Application Artifacts Must Be Packaged in the `'global'` Domain** [P1] (Impact: Medium)
   - *Check:* Inspect all packaged application metadata XML files (`sys_script*.xml`, `sys_script_client*.xml`, `sys_ui_policy*.xml`, `sys_ui_action*.xml`, `sys_security_acl*.xml`, etc.) and `.now.ts` `$override` definitions. Verify that `<sys_domain>` is `'global'` (or omitted/default `'global'`) on every packaged artifact so all tenant domains inherit the baseline configuration.
   - *Fix:* Reset `<sys_domain>global</sys_domain>` and `<sys_domain_path>/</sys_domain_path>` on all packaged metadata records.

4. **`ui_action_sys_overrides` — UI Action `'sys_overrides'` Field Must Be Empty** [P1] (Impact: Medium)
   - *Check:* Inspect `UiAction()` definitions and `sys_ui_action*.xml` records. Verify that `<sys_overrides>` is empty (`<sys_overrides/>`). In packaged baseline applications, `sys_overrides` must never be populated; to override a global or parent-table UI Action in a scoped app, create a UI Action on the child table with the same `action_name`.
   - *Fix:* Clear `<sys_overrides/>` on all `sys_ui_action` records. Use matching `action_name` on the child table if overriding a parent table's UI Action.

5. **`msp_sys_domain` — Missing `'sys_domain'` Field on Custom Data Tables** [P1] (Impact: Medium)
   - *Check:* Inspect all custom tables (`Table()` in `.now.ts`, `sys_db_object*.xml`, `sys_dictionary*.xml`, `dictionary/*.xml`) — **excluding** tables that extend `sys_import_set_row` or tables that already inherit `sys_domain` from a domain-separated parent (such as `task` or `cmdb_ci`). Verify that every custom table storing tenant data defines a `sys_domain` column of type `domain_id` (`DomainIdColumn` in Fluent). If a table holds strictly instance-owner configuration, verify its ACLs restrict access to the OOB `admin` role.
   - *Fix:* Add `sys_domain: DomainIdColumn({})` (and optionally `sys_domain_path: DomainPathColumn({})`) to every custom tenant data table, or restrict instance-wide configuration tables strictly to `admin`.

6. **`msp_sys_overrides` — Missing `'sys_overrides'` Field on `sys_metadata`-Extending Process Tables** [P2] (Impact: Medium)
   - *Check:* Inspect custom tables that extend `sys_metadata` (or store domain-overridable process/policy records). Verify they include a `sys_overrides` column (`ReferenceColumn` referencing the same table, or `OverrideColumn`) so modifying a record in a child domain creates a domain-specific override record instead of mutating the parent/global record.
   - *Fix:* Add a `sys_overrides` self-reference column (`ReferenceColumn({ referenceTable: '<same_table>' })`) on custom process/configuration tables that support per-domain overrides.

7. **`msp_defaut_domain_logic` — Missing Default Domain Logic in Business Rules** [P2] (Impact: Medium)
   - *Check:* For custom domain-separated tables, verify a `before` Business Rule exists (conditioned on `gs.getProperty("glide.sys.domain.partitioning") == "true"`) that prevents records with an empty or `'global'` domain from remaining in `'global'` (which would make tenant data visible across all domains) by assigning `current.sys_domain = global.getDefaultDomain()` (or deriving from `current.company.sys_domain`).
   - *Fix:* Add a `before` `insert`/`update` Business Rule conditioned on `gs.getProperty('glide.sys.domain.partitioning') == 'true'`:

     ```javascript
     function setDefaultDomain() {
       if (!current.company.nil()) {
         current.sys_domain = current.company.sys_domain;
       }
       if (current.sys_domain == 'global' || current.sys_domain.nil()) {
         current.sys_domain = global.getDefaultDomain();
       }
     }
     ```

8. **`msp_set_domain_br` — Missing `'Domain - Set Domain'` Business Rule on Custom Scoped Tables** [P2] (Impact: Medium)
   - *Check:* For custom scoped tables holding tenant records (e.g., child task/detail tables linked to a parent record, company, or caller), verify that a `"Domain - Set Domain - <Table>"` Business Rule exists to cascade/populate `current.sys_domain` from the parent/task/company reference upon insert and update.
   - *Fix:* Create a `before` `insert`/`update` Business Rule (modeled after OOTB `"Domain - Set Domain"` rules) that copies `sys_domain` from the parent reference or company record before falling back to `global.getDefaultDomain()`.

9. **`msp_async_br` — Async Business Rules Must Account for Domain Context** [P2] (Impact: Medium)
   - *Check:* Inspect all `when: 'async'` Business Rules (`BusinessRule({ when: 'async' })` or `sys_script*.xml` with `<when>async</when>`). Async Business Rules execute in the domain of the triggering record; if triggered by a non-domain-separated table (such as an Import Set or global queue) or if querying/inserting cross-domain records, verify the script explicitly sets or propagates `sys_domain` on target records.
   - *Fix:* In `async` Business Rules, explicitly propagate `sys_domain` from the source context (or target company/tenant reference) onto any records created or updated by the job.

10. **`msp_run_br_chkbox` — Transform Map `'Run Business Rules'` Checkbox Must Be Enabled** [P2] (Impact: Medium)
    - *Check:* Inspect all Transform Maps (`ImportSet({ runBusinessRules: ... })` in `.now.ts` and `sys_transform_map*.xml`). When a Transform Map targets a domain-separated table that relies on Business Rules for domain assignment (`msp_defaut_domain_logic` / `msp_set_domain_br`), verify `run_business_rules` (`<run_business_rules>true</run_business_rules>`) is enabled (`true`).
    - *Fix:* Set `runBusinessRules: true` (`<run_business_rules>true</run_business_rules>`) on every Transform Map targeting a domain-separated table, or explicitly assign `target.sys_domain` in the Transform Map script.
