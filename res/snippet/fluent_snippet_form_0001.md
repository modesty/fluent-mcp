# Create a new form for the incident table with two sections and a custom view

## Using the `Form()` API
> The `Form()` API writes the whole record hierarchy (`sys_ui_form`, `sys_ui_form_section`, `sys_ui_section`, `sys_ui_element`) for you, including the `.begin_split`/`.split`/`.end_split` elements of a two-column block. Do not hand-write those records with `Record()` for a form you define here.
```typescript
import { Form, Record } from '@servicenow/sdk/core';

// Create the custom view the form belongs to (use `default_view` instead for the default form)
export const exampleIncidentView = Record({
    $id: Now.ID['ex_view'],
    table: 'sys_ui_view',
    data: {
        name: 'example_incident_view',
        title: 'Example Incident View',
        roles: ['admin', 'itil'], // roles that can use the view
    },
});

export const exampleIncidentForm = Form({
    table: 'incident',
    view: exampleIncidentView,
    roles: ['admin', 'itil'],
    sections: [
        {
            caption: 'incident',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'number', type: 'table_field' },
                        { field: 'caller_id', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'state', type: 'table_field' },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'short_description', type: 'table_field' },
                    ],
                },
            ],
        },
        {
            caption: 'Additional fields',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'business_service', type: 'table_field' },
                        { type: 'list', listType: 'M2M', listRef: 'task_ci.task' }, // Affected CIs: '<join_table>.<column_name>', task_ci joins task to cmdb_ci
                    ],
                },
            ],
        },
    ],
});
```
