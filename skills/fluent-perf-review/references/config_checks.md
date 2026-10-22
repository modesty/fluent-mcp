# Configuration Performance Checks (6)

Packaged schema, import, reporting, and integration configuration that degrades instance performance or upgrades.

1. **`dictionary_type_change` — Dictionary Type Change** *(Recert only)* [P0] (Impact: Critical)
   - *Check:* Compare every column's type with the previously certified version: the Fluent column constructor (`StringColumn` → `IntegerColumn`, or `GenericColumn({ columnType })`) or `sys_dictionary` `<internal_type>`. Changing the type of an existing column forces a data conversion on upgrade and can truncate or lose data. Run the scanner with `--baseline <previous-version-dir>`; without a baseline, inspect `git log -p` on table definitions. N/A for a first certification.
   - *Fix:* Keep the existing column, add a new column with the new type, migrate data with a fix script, and retire the old column.

2. **`sys_direct_ws` — Direct System Web Service Writes** *(Manual)* [P1] (Impact: High)
   - *Check:* From integration code, design docs, and data-flow descriptions, determine whether an external system inserts or updates target tables directly — through the Table API (`/api/now/table/<table>`) or direct SOAP (`<table>.do?SOAP`). Exempt: `em_event`.
   - *Fix:* Route inbound data through the Import Set API (`/api/now/import/<staging_table>`) and a Transform Map, and set `choiceAction: 'ignore' | 'reject'` on reference/choice field maps.

3. **`log_verbosity_disable` — Verbose Logging Enabled on Robust Transform Map** [P1] (Impact: High)
   - *Check:* Inspect `sys_robust_import_set_transformer*.xml` / `Record({ table: 'sys_robust_import_set_transformer' })` for `verbose` set to `true`, which floods customer logs and storage.
   - *Fix:* Set `verbose` to `false` on every packaged Robust Transform Map.

4. **`jdbc_import_use_lastrun` — JDBC Data Source Without "Use Last Run Datetime"** [P1] (Impact: High)
   - *Check:* Inspect `sys_data_source*.xml` / `Record({ table: 'sys_data_source' })` with `type` `JDBC` where `use_last_run_datetime` is not `true`, or `last_run_database_field` is empty. Every run then re-imports the whole source table.
   - *Fix:* Set `use_last_run_datetime: true` and `last_run_database_field` to the source's last-modified column so each run imports only changed rows.

5. **`report_on_sys_audit` — Report on `sys_audit`** [P1] (Impact: High)
   - *Check:* Inspect `sys_report*.xml` / `Record({ table: 'sys_report' })` whose `table` is `sys_audit` (or a `sys_audit*` table). Scanning the audit table slows or stalls the whole instance. Also report reports on the other PERF-1 large system tables (`syslog`, `syslog_transaction`, `sys_email`) [P2].
   - *Fix:* Remove the report. System tables are excluded from reporting by default for this reason; report on the application's own tables instead.

6. **`index_found` — Packaged Database Index** [P2] (Impact: Medium)
   - *Check:* Inventory `Table({ index: [...] })`, `sys_index*.xml`, and `<index>` elements in `dictionary/*.xml`. Unique indexes and indexes on out-of-scope tables are findings [P2]: building an index on a populated customer table is expensive, and a unique index rejects writes when existing data has duplicates. Other indexes need review [P3].
   - *Fix:* Remove every index that is not required (unique indexes in particular), and justify any index that remains in the submission notes.
