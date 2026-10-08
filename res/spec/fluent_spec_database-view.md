# **Context:** DatabaseView API spec (SDK v4.13.0+): Defines a **database view** — a read-only virtual table that SQL-joins existing tables into one reportable pseudo-table and stores no data of its own. One `DatabaseView()` call writes `sys_db_view` plus one `sys_db_view_table` per `tables` entry and one `sys_db_view_table_field` per `fields` entry inside each table. Import `DatabaseView` from `@servicenow/sdk/core`. `name` is the identity (the build coalesces on it), so a top-level `$id` is **not accepted**, and neither is `$meta`; `protectionPolicy` and `$override` are. `name` must already be normalized and must start with `u_` in global scope or `<scope>_` (e.g. `x_acme_`) in an `x_` scope — both are hard build errors.

```typescript
import { DatabaseView } from '@servicenow/sdk/core'

// Creates a Database View. Child records land in sys_db_view_table (one per `tables` entry) and
// sys_db_view_table_field (one per `fields` entry; the build copies the parent's `table` onto each field row).
// The return value is the config itself, NOT a table-branded reference: consumers (dashboards, reports,
// field styles) reference the view by its `name` string.
DatabaseView({
  // NOT accepted: a top-level `$id` (TS2353 — `name` is the identity) and `$meta` (TS2353 — no installMethod, no useEsLatest).
  name: 'u_incident_caller_group', // string, mandatory - identity/coalesce key. Must be unique across all database views and must not
    // equal a real table name (the platform aborts the save; the build does not check). Renaming = a new view.
    // Must ALREADY be normalized: lowercase, every character outside [a-z0-9_] replaced with '_' — otherwise a hard build error
    // (the platform rewrites the name on save, so a non-normalized name would create a duplicate view on the next build).
    // Prefix: 'u_' in global scope, '<scope>_' (e.g. 'x_acme_') in an x_ scope — otherwise a hard build error.
    // Scopes that are neither global nor x_-prefixed (sn_*, now_*, ...) are not prefix-checked.
  label: 'Incident Caller And Group', // string, optional (default '') - display label in admin and reporting UIs
  plural: 'Incident Callers And Groups', // string, optional (default '') - plural label (e.g. list titles)
  description: 'Incidents joined to caller and assignment group for reporting', // string, optional (default '')

  // ── TABLES: DatabaseViewTable[], mandatory - joined in `order`. May be an empty array (a view with no joined tables is legal) ──
  tables: [
    {
      $id: Now.ID['view_inc'], // Now.ID | string | number, MANDATORY on every entry - no natural key exists, because the same
        // table may be joined twice under different prefixes. Missing -> TS2322 and a failed build
      table: 'incident', // TableName, mandatory - ANY string compiles; table existence is NOT validated at build time.
        // In a scoped app prefer a same-scope table, or a scoped table that extends the out-of-box one (advisory only)
      variablePrefix: 'inc', // string, mandatory - qualifies this table's columns in every whereClause as inc_<field>.
        // Hard build errors: contains '_', longer than 30 characters, or reused by another entry in this view.
        // Use lowercase only (uppercase may prevent viewing the view in a list; not enforced)
      order: 100, // number, optional (default 100) - join order; the LOWEST order is the base table. Put the smallest /
        // most selective table first. Two entries with the same order only emit a hint the CLI never prints
      leftJoin: false, // boolean, optional (default false) - false = INNER JOIN (row must match every joined table);
        // true = LEFT OUTER JOIN (rows from prior tables stay, this table's columns are empty when unmatched)
      active: true, // boolean, optional (default true) - whether this joined table participates
      fields: [ // DatabaseViewField[], optional - columns of `table` to expose. Omit for a table joined only to constrain the
        // result through whereClause. Once NON-EMPTY it is an ALLOWLIST, also for the join engine: every column of this
        // table that ANY whereClause references (including its own sys_id) must be listed, or the join fails at runtime
        // (not build-checked)
        { $id: Now.ID['view_inc_number'], field: 'number' }, // $id: mandatory per field (use distinct $ids if a field repeats).
          // field: TableSchemaDotWalk<table> | string, mandatory - AUTOCOMPLETE ONLY: any string compiles, and a misspelled
          // column is not caught at build time. Expose the referenced table's column by joining it, not by dot-walking
        { $id: Now.ID['view_inc_short_description'], field: 'short_description' },
        { $id: Now.ID['view_inc_caller_id'], field: 'caller_id' }, // referenced by usr's whereClause below, so listed
        { $id: Now.ID['view_inc_assignment_group'], field: 'assignment_group' }, // referenced by grp's whereClause below
      ],
      // NOT accepted on a field entry: an alias / display name, a `name`, or a `table` — only `$id` + `field`
    },
    {
      $id: Now.ID['view_usr'],
      table: 'sys_user',
      variablePrefix: 'usr',
      order: 200,
      whereClause: 'inc_caller_id=usr_sys_id', // string, optional (default '') - RAW join predicate with <variablePrefix>_<field>
        // names on BOTH sides. NOT an encoded query: no '^' / '^OR'. Operators: = != < <= > >=, combined with && and ||
        // (e.g. 'inc_rfc=chg_sys_id || chg_parent=inc_sys_id'). LIKE and CONTAINS are not supported
      fields: [
        { $id: Now.ID['view_usr_sys_id'], field: 'sys_id' }, // listed because inc_caller_id=usr_sys_id joins against it
        { $id: Now.ID['view_usr_name'], field: 'name' },
        { $id: Now.ID['view_usr_email'], field: 'email' },
      ],
    },
    {
      $id: Now.ID['view_grp'],
      table: 'sys_user_group',
      variablePrefix: 'grp',
      order: 300,
      leftJoin: true, // keep incidents that have no assignment group
      whereClause: 'inc_assignment_group=grp_sys_id',
      fields: [
        { $id: Now.ID['view_grp_sys_id'], field: 'sys_id' },
        { $id: Now.ID['view_grp_name'], field: 'name' },
      ],
    },
  ],

  // ── Cross-cutting (Now.Internal.WithMetadata) ──
  protectionPolicy: 'read', // 'read' | 'protected', optional - post-install developer access. The build copies it onto EVERY
    // child sys_db_view_table and sys_db_view_table_field row. Omit to allow other developers to customize
  // $override: { ... } // optional - extra sys_db_view columns, ROOT record only (sys_id, sys_scope, sys_update_name, and
  //   sys_domainpath are blocked)
})
```
