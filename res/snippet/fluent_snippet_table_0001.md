# create Table with StringColumn and extends the task table, and dynamically calculated fields like dynamic1.It specifies various properties for these columns The table also includes configuration options
```typescript
import { Table, StringColumn } from "@servicenow/sdk/core";

// Define a new table named 'x_snc_example_to_do'
export const x_snc_example_to_do = Table({
    name: get_table_name('x_snc_example_to_do'), // string, table name
    label: 'My To Do Table', // Display label for the table
    extends: get_table_name('task'), // Extends the 'task' table
    schema: {
        status: StringColumn({ label: 'status' }), // String column for status
        deadline: StringColumn({
            label: 'deadline', // Label for the column
            active: true, // Indicates whether the column is active
            mandatory: false, // Field is not mandatory
            read_only: false, // Field is editable
            maxLength: 40, // Maximum allowed length for the value
            dropdown: 'none', // No dropdown selection available
            attributes: { 
                update_sync: false, // Prevents syncing updates automatically
            },
            default: 'today', // Default value for the field
            dynamic_value_definitions: {
                type: 'calculated_value', // Value will be dynamically calculated
                calculated_value: '', // Placeholder for calculation logic
            },
            choices: { // Predefined choices for the dropdown
                choice1: {
                    label: 'choice1 Label', // Display label
                    sequence: 0, // Order in which the choice appears
                    inactive_on_update: false, // Stays active on update
                    dependent_value: '5', // Condition-based display
                    hint: 'hint', // Tooltip hint for UI
                    inactive: false, // Indicates if the choice is active
                    language: 'en', // Language of the label
                },
                choice2: { label: 'choice2 Label', sequence: 1 },
            },
        }),
        dynamic1: StringColumn({
            dynamic_value_definitions: {
                type: 'calculated_value', // Value is computed dynamically
                calculated_value: script``, // Function that computes value
            },
        }),
        dynamic2: StringColumn({
            dynamic_value_definitions: {
                type: 'dynamic_default', // Default value is determined dynamically
                dynamic_default: `gs.info()`, // Calls a function for the default value
            },
        }),
        dynamic3: StringColumn({
            dynamic_value_definitions: {
                type: 'dependent_field', // Field value depends on another field
                column_name: 'status', // Field it depends on
            },
        }),
        dynamic4: StringColumn({
            dynamic_value_definitions: {
                type: 'choices_from_other_table', // Fetches choices from another table
                table: 'sc_cat_item', // Source table for choices
                field: 'display', // Field from which choices are retrieved
            },
        }),
    },
    actions: ['create', 'read'], // Allowed actions for the table
    display: 'deadline', // Field used as the display value
    accessible_from: 'package_private', // Scope restrictions for access
    allow_client_scripts: true, // Enables client-side scripts
    allow_new_fields: true, // Allows new fields to be added dynamically
    allow_ui_actions: true, // Enables UI actions on the table
    allow_web_service_access: true, // Allows API access
    extensible: true, // Table can be extended further
    live_feed: true, // Enables live feed updates
    caller_access: 'none', // Restricts caller access
    auto_number: {
        number: 10, // Starting number for auto-increment
        number_of_digits: 2, // Number of digits in the auto-generated number
        prefix: 'abc', // Prefix for auto-generated numbers
    },
    audit: true, // Enables auditing for tracking changes
    read_only: true, // Table is read-only
    text_index: true, // Enables text indexing for search
    attributes: {
        update_sync: true, // Enables synchronization for updates
    },
    index: [
        {
            name: 'idx', // Name of the index
            element: 'status', // Column to be indexed
            unique: true, // Ensures uniqueness of values in this column
        },
    ],
})

```
