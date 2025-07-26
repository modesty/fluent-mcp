# create a new form for the incident table with two sections, and a custom view to store them
```typescript
import { Record } from '@servicenow/sdk/core';

// Create a new view to add the form and sections to
const example_view = Record({
    $id: Now.ID['ex_view'],
    table: 'sys_ui_view',
    data: {
        name: 'example_incident_view',
        title: 'Example Incident View',
        roles: 'admin,itil' // comma-separated list of roles for the view
    }
});


// Create a new form to contain the sections
const example_form = Record({
    $id: Now.ID['ex_form'],
    table: 'sys_ui_form',
    data: {
        name: 'incident',
        view: example_view,
    }
})


// Create two sections for the form
const example_section_1 = Record({ // create a first section to store the standard fields
    $id: Now.ID['section_1'],
    table: 'sys_ui_section',
    data: {
        name: 'incident',
        table: 'incident',
        view: example_view,
        caption: '' // no caption for the first section
    }
})

const example_section_2 = Record({ // create a second section to store some additional fields
    $id: Now.ID['section_2'],
    table: 'sys_ui_section',
    data: {
        name: 'incident',
        table: 'incident',
        view: example_view,
        caption: 'Additional fields'
    }
})


// Create a `sys_ui_form_section` record for each section to associate it with the form
Record({
    $id: Now.ID['form_section_1'],
    table: 'sys_ui_form_section',
    data: {
        sys_ui_form: example_form,
        sys_ui_section: example_section_1,
        position: 0
    }
})

Record({
    $id: Now.ID['form_section_2'],
    table: 'sys_ui_form_section',
    data: {
        sys_ui_form: example_form,
        sys_ui_section: example_section_2,
        position: 1
    }
})


// Create `sys_ui_element` records for each of the fields in the first section
Record({
    $id: Now.ID['element_1'],
    table: 'sys_ui_element',
    data: {
        element: 'number', // must match a valid field name for the corresponding table (in this case incident)
        position: 0,
        sys_ui_section: example_section_1
    }
})

Record({
    $id: Now.ID['element_2'],
    table: 'sys_ui_element',
    data: {
        element: 'caller_id',
        position: 1,
        sys_ui_section: example_section_1
    }
})

Record({
    $id: Now.ID['element_3'],
    table: 'sys_ui_element',
    data: {
        element: '.split',
        position: 2,
        type: '.split', // creates a column break between the fields in the form
        sys_ui_section: example_section_1
    }
})

Record({
    $id: Now.ID['element_4'],
    table: 'sys_ui_element',
    data: {
        element: 'state',
        position: 3,
        sys_ui_section: example_section_1
    }
})

Record({
    $id: Now.ID['element_5'],
    table: 'sys_ui_element',
    data: {
        element: '.end_split',
        position: 4,
        type: '.end_split', // ends the column break between the fields in the form
        sys_ui_section: example_section_1
    }
})

Record({
    $id: Now.ID['element_6'],
    table: 'sys_ui_element',
    data: {
        element: 'short_description',
        position: 5,
        sys_ui_section: example_section_1
    }
})


// Create `sys_ui_element` records for each of the fields in the second section
Record({
    $id: Now.ID['element_7'],
    table: 'sys_ui_element',
    data: {
        element: 'business_service',
        position: 0,
        sys_ui_section: example_section_2
    }
})

Record({
    $id: Now.ID['element_8'],
    table: 'sys_ui_element',
    data: {
        element: 'M2M.incident.task_ci.task',
        position: 1,
        type: 'list',
        sys_ui_section: example_section_2
    }
})
```
