#**Context:** Table API spec: Used to create a new Table (`sys_db_object`) in ServiceNow, Table is also referenced as Dictionary or data model in ServiceNow. This API is closely related to the Column API for its schema property definition.
```typescript
// Creates a new Table (`sys_db_object`)
Table({ 
    name: '', // string, table name
    schema: {},// object, snake_case name values pairs, ex. { column_name1: Column object, column_name2: Column object } see Column spec
    extends: '', // undefined | string
    label: '', // string or array of Documentation object
	licensing_config: {}, // LicensingConfig object
    display: '', // string
    extensible: false, // boolean
    live_feed: false, // boolean
    accessible_from: 'package_private', // 'public' | 'package_private'
    caller_access: 'none', // 'none' | 'tracking' | 'restricted'
    actions: [], // array of 'read' | 'update' | 'delete' | 'create'
    allow_web_service_access: false, // boolean
    allow_new_fields: false, // boolean
    allow_ui_actions: false, // boolean
    allow_client_scripts: false, // boolean
    audit: false, // boolean
    read_only: false, // boolean
    text_index: false, // boolean
    attributes: {}, // object, snake_case name value pairs of any supported dictionary attributes in ServiceNow [sys_schema_attribute], ex. { update_sync_custom: false, update_synch: true }
    index: [ // Array of index definitions
        {
            name: '', // string, mandatory
            unique: false, // boolean, mandatory
            element: '', // string | string[], mandatory
        }
    ],
    auto_number: { // Auto-numbering configuration
        prefix: '', // string
        number: 0, // number
        number_of_digits: 0, // number
    },
    scriptable_table: false, // boolean
}): Table; // returns a Table object

// Creates a new LicensingConfig object
LicensingConfig({
	license_model: 'none', // 'none' | 'fulfiller' | 'producer'
	owner_condition: '', // string
	license_condition: '', // string
	is_fulfillment: false, // boolean
	op_delete: false, // boolean
	op_update: false, // boolean
	op_insert: false, // boolean
	license_roles: [], // string[]
}): LicensingConfig // returns a LicensingConfig object

// Creates a new Documentation (`sys_documentation`)
Documentation({
	hint: '', // string
	help: '', // string
	label: '', // string
	plural: '', // string
	language: '', // string
	url: '', // string
	url_target: '', // string
}): Documentation // returns a Documentation object

```
