#**Context:** Table API spec: Used to create a new Table (`sys_db_object`) in ServiceNow, Table is also referenced as Dictionary or data model in ServiceNow. This API is closely related to the Column API for its schema property definition.
```typescript
// Creates a new Table (`sys_db_object`)
Table({
    name: '', // string, table name
    schema: {},// object, snake_case name values pairs, ex. { column_name1: Column object, column_name2: Column object } see Column spec
    extends: '', // undefined | string
    label: '', // string or array of Documentation object
    licensingConfig: {}, // LicensingConfig object
    display: '', // string
    extensible: false, // boolean
    liveFeed: false, // boolean
    accessibleFrom: 'package_private', // 'public' | 'package_private' (defaults to 'public' as of SDK 4.8.0; 'package_private' restricts cross-scope read access but hides the table from some platform features such as Business Rules)
    callerAccess: 'none', // 'none' | 'tracking' | 'restricted'
    // ACCESS PROPERTIES — the SDK derives NO defaults for `actions`, `allowClientScripts`, `allowConfiguration`,
    // `allowNewFields`, `allowUiActions` and `allowWebServiceAccess`. Each is written to the table's metadata ONLY
    // if you set it in Fluent; anything you omit is left to the instance's own default at install time.
    actions: { read: true, create: true, update: true, delete: false }, // TableActionAccess object (exported from '@servicenow/sdk/core'), all four keys optional: { read?, update?, delete?, create? }. Each action is THREE-STATE — `true` AND `false` are both written to metadata, an OMITTED action is not written at all. Prefer this object form; the array form (['read' | 'update' | 'delete' | 'create'][]) is DEPRECATED as of SDK v4.10.1 because it is a COMPLETE ENUMERATION: ['read'] writes read_access=true PLUS update_access=false, delete_access=false and create_access=false. (The SDK 4.13 table-api doc shows only `TableActionAccess`, but the installed type still accepts the deprecated array and it still writes those `false` values.)
    allowWebServiceAccess: false, // boolean, no SDK-applied default
    allowNewFields: false, // boolean, no SDK-applied default
    allowUiActions: false, // boolean, no SDK-applied default
    allowClientScripts: false, // boolean, no SDK-applied default
    allowConfiguration: false, // boolean, optional (SDK v4.13.3+) — allow design-time configuration of the table itself from other
        // application scopes ("Allow configuration" on the Application Access form); written as the `configuration_access`
        // attribute. No SDK-applied default: omitted means the platform inherits the value from the parent table
    audit: false, // boolean
    readOnly: false, // boolean
    textIndex: false, // boolean
    attributes: {}, // object, snake_case name value pairs of any supported dictionary attributes in ServiceNow [sys_schema_attribute], ex. { update_sync_custom: false, update_synch: true }
    index: [ // Array of index definitions
        {
            name: '', // string, optional (an unnamed index is generated without a name attribute)
            unique: false, // boolean, mandatory
            element: '', // string | string[], mandatory - column name(s) making up the index; accepts custom columns and platform default columns (e.g. 'sys_created_on', 'sys_updated_on') as of SDK v4.9.0
        }
    ],
    autoNumber: { // Auto-numbering configuration
        prefix: '', // string
        number: 0, // number
        numberOfDigits: 0, // number
    },
    scriptableTable: false, // boolean
    sizeClass: 0, // number, optional (SDK v4.11.0+) - size classification of the table, indicating its
        // expected size category. Free-form number; the SDK derives no default and validates no range
    dbObjectId: false, // boolean, optional (SDK v4.13.3+), default: false - when true, writes the table's sys_id to the
        // `db_object_id` attribute of the bootstrap dictionary XML, pinning the platform-created `sys_db_object` record
        // to that sys_id (use when other metadata references the `sys_db_object` record directly). Not allowed with `augments`
}): Table; // returns a Table object

// ─── TABLE AUGMENTS (SDK v4.7.0+) ───
// Add columns to an EXISTING platform or cross-scope table (owned by another scope) without creating a new table.
// Set `augments` to the target table name; when set, only `schema` and — SDK v4.13.0+ — `index` are allowed. All
// other table-level properties (name, extends, label, display, audit, access flags, allowConfiguration, dbObjectId,
// etc.) are rejected by the TypeScript compiler. The build produces `sys_dictionary` records for each column but does
// NOT create a `sys_db_object` (the table already exists). As of SDK v4.13.0 the augment's dictionary XML carries only
// the table name and type, so augmenting no longer overwrites platform-set table attributes such as access flags.
// Added column names MUST begin with the current app's ownership prefix to avoid collisions with platform fields:
// `<scope>_` in an `x_` scope (e.g. `x_acme_`), or `u_` in global — the build rejects anything else, so a
// Store app (always an `x_` scope) uses its scope prefix, never `u_`.
// The exported variable name should match the augmented table name.
export const incident = Table({
    augments: 'incident',          // string, mandatory in augment mode — the full name of the existing table to extend
    schema: {                       // the columns to add
        x_acme_escalation_reason: StringColumn({ label: 'Escalation Reason', maxLength: 500 }),
        x_acme_reviewed: BooleanColumn({ label: 'Reviewed' }),
    },
    index: [                        // optional (SDK v4.13.0+) — same shape as on a named table; `element` may reference
        // columns you add (keys of `schema`) or pre-existing columns of the target table
        { name: 'idx_acme_escalation_reason', unique: false, element: 'x_acme_escalation_reason' },
        { unique: false, element: ['x_acme_reviewed', 'sys_created_on'] },
    ],
})

// ─── DICTIONARY OVERRIDES (SDK v4.6.0+) ───
// To override a column inherited from a parent table, use OverrideColumn() inside the schema of a child table.
// This creates the underlying `sys_dictionary_override` record automatically — no separate API call needed.
import { Table, OverrideColumn } from '@servicenow/sdk/core'

export const x_my_app_my_task = Table({
    name: 'x_my_app_my_task',
    extends: 'task',
    schema: {
        priority: OverrideColumn({
            baseTable: 'task',     // mandatory — the table the column is inherited from
            mandatory: true,       // optional — override mandatory
            default: '1',          // optional — override default value
            // Other overridable properties: readOnly, readOnlyOption, display, max_length, choice (where supported)
        }),
        state: OverrideColumn({
            baseTable: 'task',
            mandatory: true,
            readOnlyOption: 'display_read_only',
        }),
        description: OverrideColumn({
            baseTable: 'task',
            display: false,
        }),
    },
})

// Creates a new LicensingConfig object
LicensingConfig({
    licenseModel: 'none', // 'none' | 'fulfiller' | 'producer'
    ownerCondition: '', // string
    licenseCondition: '', // string
    isFulfillment: false, // boolean
    opDelete: false, // boolean
    opUpdate: false, // boolean
    opInsert: false, // boolean
    licenseRoles: [], // string[]
}): LicensingConfig // returns a LicensingConfig object

// Creates a new Documentation (`sys_documentation`)
Documentation({
    hint: '', // string
    help: '', // string
    label: '', // string
    plural: '', // string
    language: '', // string
    url: '', // string
    urlTarget: '', // string
}): Documentation // returns a Documentation object

```
