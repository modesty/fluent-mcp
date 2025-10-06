# create Table with StringColumn and extends the task table, and dynamically calculated fields like dynamic1.It specifies various properties for these columns The table also includes configuration options
```typescript
import { Table, StringColumn } from "@servicenow/sdk/core";

// Define a new table named 'x_snc_example_to_do'
export const x_snc_example_to_do = Table({
    name: 'x_snc_example_to_do', // string, table name
    label: 'My To Do Table', // Display label for the table
    extends: 'task', // Extends the 'task' table
    schema: {
        status: StringColumn({ label: 'status' }), // String column for status
        deadline: StringColumn({
            label: 'deadline', // Label for the column
            active: true, // Indicates whether the column is active
            mandatory: false, // Field is not mandatory
            readOnly: false, // Field is editable
            maxLength: 40, // Maximum allowed length for the value
            dropdown: 'none', // No dropdown selection available
            attributes: { 
                update_sync: false, // Prevents syncing updates automatically
            },
            default: 'today', // Default value for the field
            dynamicValueDefinitions: {
                type: 'calculated_value', // Value will be dynamically calculated
                calculatedValue: '', // Placeholder for calculation logic
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
            dynamicValueDefinitions: {
                type: 'calculated_value', // Value is computed dynamically
                calculatedValue: script``, // Function that computes value
            },
        }),
        dynamic2: StringColumn({
            dynamicValueDefinitions: {
                type: 'dynamic_default', // Default value is determined dynamically
                dynamicDefault: `gs.info()`, // Calls a function for the default value
            },
        }),
        dynamic3: StringColumn({
            dynamicValueDefinitions: {
                type: 'dependent_field', // Field value depends on another field
                columnName: 'status', // Field it depends on
            },
        }),
        dynamic4: StringColumn({
            dynamicValueDefinitions: {
                type: 'choices_from_other_table', // Fetches choices from another table
                table: 'sc_cat_item', // Source table for choices
                field: 'display', // Field from which choices are retrieved
            },
        }),
    },
    actions: ['create', 'read'], // Allowed actions for the table
    display: 'deadline', // Field used as the display value
    accessibleFrom: 'package_private', // Scope restrictions for access
    allowClientScripts: true, // Enables client-side scripts
    allowNewFields: true, // Allows new fields to be added dynamically
    allowUiActions: true, // Enables UI actions on the table
    allowWebServiceAccess: true, // Allows API access
    extensible: true, // Table can be extended further
    liveFeed: true, // Enables live feed updates
    callerAccess: 'none', // Restricts caller access
    autoNumber: {
        number: 10, // Starting number for auto-increment
        numberOfDigits: 2, // Number of digits in the auto-generated number
        prefix: 'abc', // Prefix for auto-generated numbers
    },
    audit: true, // Enables auditing for tracking changes
    readOnly: true, // Table is read-only
    textIndex: true, // Enables text indexing for search
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
