# Add a new field to an existing section for the `ex_table` table
```typescript
import { Record } from '@servicenow/sdk/core';

// Open the existing section in fluent
const existing_section = Record({
    $id: Now.ID['existing_section'],
    table: 'sys_ui_section',
    data: {
        sys_id: get_sys_id('sys_ui_section', 'name=ex_table^caption=Additional details') // search for the sys_id of the section with table named `ex_table` and caption `Additional details`
    }
})

// Add a new field to this section
Record({
    $id: Now.ID['new_element'],
    table: 'sys_ui_element',
    data: {
        element: 'short_description', // must match a valid field name for the corresponding table (in this case ex_table)
        position: 5, // assuming 5 elements already present
        sys_ui_section: existing_section
    }
})
```