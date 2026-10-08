# Instructions for Fluent Table API
Always reference the Table API to create Table (Dictionary) for more details.
1. Generated code should always start with proper import statements for referenced types.
2. Tables should always be assigned to an exported variable with the same name as the table name field to ensure proper typeahead support for Columns. 
3. The `name` field must be prefixed with scope name. If `name` is not prefixed with scope name there will be a design time error.
4. The `extends` field takes a table name as a string.
5. The `index` takes an array of column names to generate indexes in bootstrap.xml. To specify a composite index, add multiple column names to 'element' array.
6. Columns are specified as additional function calls within the Table API on the `schema` key. The `name` field is taken from the variable name or object key provided to the Table API.
7. For creating attributes refer to the provided attributes in the table spec.
8. Here are valid `functionDefinition` functions that Column objects can use: [
    'add',
    'coalesce',
    'concat',
    'datediff',
    'dayofweek',
    'distance_sphere',
    'divide',
    'greatest',
    'least',
    'length',
    'multiply',
    'position',
    'substring',
    'subtract'
]
9. Use `Now.attach('path/to/image.png')` to set default image values for BasicImageColumn fields. The image file must exist in the project and the path is relative to the source root. Supported formats: jpg, png, bmp, gif, jpeg, ico, svg.
10. For tables outside application scope, configure `dependencies.global.tables` in `now.config.json` and run `now-sdk dependencies` to pull type definitions. This enables type-checked references to global tables like `cmdb_ci_server` via `#now:{scope}/{category}` imports.
11. **SDK v4.6.0 — Dictionary overrides**: To override a column inherited from a parent table, place an `OverrideColumn({ baseTable, … })` entry in the child table's `schema`. This produces the underlying `sys_dictionary_override` record automatically — there is no longer any need to author a separate `Record({ table: 'sys_dictionary_override', … })`. Override-able properties typically include `mandatory`, `default`, `readOnly`, `readOnlyOption`, `display`, and `max_length` (subject to the column type).
12. **SDK v4.7.0 — Table augments**: To add columns to a table owned by another scope (a platform table like `incident`, or a cross-scope table) without creating a new table, set `augments: '<target_table_name>'` instead of `name`. In augment mode only `augments`, `schema` and — SDK v4.13.0+ — `index` are allowed — the compiler rejects `name`, `extends`, `label`, `audit`, the access flags, etc. An augment `index` may reference the columns you add or pre-existing columns of the target table. As of SDK v4.13.0 an augment no longer overwrites the target table's platform-set attributes (such as access flags): only the table name and type are written. The build emits `sys_dictionary` records for the new columns but no `sys_db_object`. Every added column name MUST begin with the current app's ownership prefix to avoid collisions with platform fields: `<scope>_` in an `x_` scope (e.g. `x_acme_`), or `u_` in global — the build rejects anything else, so a Store app (always an `x_` scope) uses its scope prefix, never `u_`. Name the exported variable after the augmented table. Use `augments` only when the target table already exists on the platform; to create a brand-new table, use `name` as usual.
13. **SDK v4.10.1 — `actions` object form**: Always use the `TableActionAccess` object form, `actions: { read: true, create: true }`. The array form (`actions: ['read', 'create']`) is deprecated because it is a **complete enumeration**: every action it leaves out is written as `false`, so `actions: ['read']` silently writes `update_access=false`, `delete_access=false` and `create_access=false` as well. The object form is three-state instead — `true` and `false` are both written to the table's metadata, while an action you omit is not written at all, leaving the instance's install-time default in place. The same "only what you set is written" rule applies to `allowClientScripts`, `allowConfiguration` (SDK v4.13.3+), `allowNewFields`, `allowUiActions` and `allowWebServiceAccess`: the SDK derives no defaults for them, so set each one you care about explicitly. Note `maxLength` likewise has no SDK-applied default any more — omit it to inherit the instance's install-time default. Keep using the object form even though the SDK 4.13 table-api doc shows only `TableActionAccess`: the deprecated array form still compiles and still writes `false` for every omitted action.
14. **SDK v4.10.1 — state-driven requirements belong in a State Model.** When a field is required only to complete one specific move between states (rather than whenever the record sits in that state, however it got there), express it as a `'Mandatory Fields'` condition on that transition in a State Model instead of a `DataPolicy`. See the `state-model` spec.
15. **SDK v4.11.0** — `sizeClass?: number` declares the table's expected size category. It is a free-form number: the SDK derives no default and validates no range, so only set it when you have a specific classification to record from the platform's sizing guidance.
16. **SDK v4.13.3** — `allowConfiguration: boolean` controls design-time configuration of the table itself from other application scopes (written as `configuration_access`); omit it to inherit the parent table's value. `dbObjectId: true` pins the generated `sys_db_object` record to the table's own sys_id (written as `db_object_id`) — set it only when other metadata references the `sys_db_object` record directly. Neither is allowed with `augments`.
17. An `index` entry needs only `unique` and `element`; `name` is optional.
