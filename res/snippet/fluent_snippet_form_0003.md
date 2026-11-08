# Add a new section to an existing form for the `ex_table` table
> Note: This snippet uses the legacy Record API. For new forms, prefer the `Form()` API (see snippet_0001).

```typescript
import { Record } from '@servicenow/sdk/core';

// Reference the existing form: look up the sys_id of the `sys_ui_form` record on the instance with `name=ex_table^view.name=exampleview`
const existing_form = Now.ref('sys_ui_form', '<sys_id>')

// Create a new section for the form
const new_section = Record({
    $id: Now.ID['new_section'],
    table: 'sys_ui_section',
    data: {
        name: 'ex_table', // the table the section belongs to (sys_ui_section has no `table` column; `name` is the table)
        view: Now.ref('sys_ui_view', '<sys_id>'), // the existing `exampleview` view: look up its sys_id on the instance with `name=exampleview` (a coalesce-key ref such as { name: 'exampleview' } writes a derived sys_id, not the instance's)
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
```
