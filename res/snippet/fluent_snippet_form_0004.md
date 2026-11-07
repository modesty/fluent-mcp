# Add a new field to an existing section for the `ex_table` table
> Note: This snippet uses the legacy Record API. For new forms, prefer the `Form()` API (see snippet_0001).

```typescript
import { Record } from '@servicenow/sdk/core';

// Reference the existing section: look up the sys_id of the `sys_ui_section` record on the instance with `name=ex_table^caption=Additional details`
const existing_section = Now.ref('sys_ui_section', '<sys_id>')

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