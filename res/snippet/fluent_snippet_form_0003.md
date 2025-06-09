# Add a new section to an existing form for the `ex_table` table
```typescript
import { Record } from '@servicenow/sdk/core';

// Open the existing form in fluent
const existing_form = Record({
    $id: Now.ID['existing_form'],
    table: 'sys_ui_form',
    data: {
        sys_id: get_sys_id('sys_ui_form', 'name=ex_table^view=exampleview') // search for the sys_id of the form with table named `ex_table` and view `exampleview`
    }
})

// Create a new section for the form
const new_section = Record({
    $id: Now.ID['new_section'],
    table: 'sys_ui_section',
    data: {
        name: get_table_name('ex_table'),
        table: get_table_name('ex_table'),
        view: get_sys_id('sys_ui_view', 'name=exampleview^ORtitle=exampleview'), // find the sys_id of an existing view
        caption: 'Additional details'
    }
})

// Create a `sys_ui_form_section` record for the new section
Record({
    $id: Now.ID['new_form_section'],
    table: 'sys_ui_form_section',
    data: {
        sys_ui_form: existing_form,
        sys_ui_section: new_section,
        position: 2 // assuming there are already 2 pre-existing sections
    }
})

// Add one field to this new section
Record({
    $id: Now.ID['element_1'],
    table: 'sys_ui_element',
    data: {
        element: 'short_description', // must match a valid field name for the corresponding table (in this case ex_table)
        position: 0,
        sys_ui_section: new_section
    }
})
