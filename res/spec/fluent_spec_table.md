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
    accessibleFrom: 'package_private', // 'public' | 'package_private'
    callerAccess: 'none', // 'none' | 'tracking' | 'restricted'
    actions: [], // array of 'read' | 'update' | 'delete' | 'create'
    allowWebServiceAccess: false, // boolean
    allowNewFields: false, // boolean
    allowUiActions: false, // boolean
    allowClientScripts: false, // boolean
    audit: false, // boolean
    readOnly: false, // boolean
    textIndex: false, // boolean
    attributes: {}, // object, snake_case name value pairs of any supported dictionary attributes in ServiceNow [sys_schema_attribute], ex. { update_sync_custom: false, update_synch: true }
    index: [ // Array of index definitions
        {
            name: '', // string, mandatory
            unique: false, // boolean, mandatory
            element: '', // string | string[], mandatory
        }
    ],
    autoNumber: { // Auto-numbering configuration
        prefix: '', // string
        number: 0, // number
        numberOfDigits: 0, // number
    },
    scriptableTable: false, // boolean
}): Table; // returns a Table object

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
