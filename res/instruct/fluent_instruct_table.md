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
12. **SDK v4.7.0 — Table augments**: To add columns to a table owned by another scope (a platform table like `incident`, or a cross-scope table) without creating a new table, set `augments: '<target_table_name>'` instead of `name`. In augment mode only `augments` and `schema` are allowed — the compiler rejects `name`, `extends`, `label`, `audit`, etc. The build emits `sys_dictionary` records for the new columns but no `sys_db_object`. Every added column MUST be prefixed with `u_` (the compiler enforces this when augmenting), and name the exported variable after the augmented table. Use `augments` only when the target table already exists on the platform; to create a brand-new table, use `name` as usual.
