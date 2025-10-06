# **Context:** Form API spec: Used to create a new Form (`sys_ui_form`) object, which specifies how to view a record in a table, including which Sections (`sys_ui_section`) and fields (`sys_ui_element`) to display. This Form can be a part of a new View (`sys_ui_view`) or existing default view (`default_view`).

```typescript
// spec to configure a Form (`sys_ui_form`) in Fluent using the Record Plugin
const example_form = Record({
    $id: '', // string, unique id for the record, typically using Now.ID["value"]
    table: 'sys_ui_form', // string, must always leave as 'sys_ui_form'
    data: {
        name: '', // string, name of the table the form is for
        view: get_sys_id('sys_ui_view', ''), // Record<'sys_ui_view'>, The UI view (`sys_ui_view`) to contain the form. Can create a new view using Record plugin, use the sys_id of an existing view, or import and use `default_view`
        sysUser: '' // String, optional, the user to apply the form view to
    }
});

// spec to create a Section (`sys_ui_section`) in Fluent. Sections are a container for form elements
const example_section = Record({
    $id: '', // string, unique id for the record, typically using Now.ID["value"]
    table: 'sys_ui_section', // string, must always leave as 'sys_ui_section'
    data: {
        name: '', // string, name of the table the section is for
        table: '', // string, table name the section is for
        view: get_sys_id('sys_ui_view', ''), // Record<'sys_ui_view'>, The UI view (`sys_ui_view`) to contain the section. Can create a new view using Record plugin, use the sys_id of an existing view, or import and use `default_view`
        caption: '' // string, optional, the title of the section
    }
})

// spec to create a section Element (`sys_ui_element`) in Fluent. Elements are usually fields on the form but can also be splits or annotations
Record({
    $id: '', // string, unique id for the record, typically using Now.ID["value"]
    table: 'sys_ui_element', // string, must always leave as 'sys_ui_element'
    data: {
        element: '', // string, the name of the field to display. Must match a valid field name for the associated table, or be a special name like '.split'
        position: 0, // number, the position of the element in  the section
        type: 'element', // string, optional, the type of element: 'element'|'list'|'chart'|'annotation'|'formatter'|'.split'|'.begin_split'|'.end_split'.
        sysUiSection: example_section, // Record<'sys_ui_section'> that references either a new or existing sys_ui_section record
        sysUiFormatter: get_sys_id('sys_ui_formatter', '') // optional, sys_id | Record<'sys_ui_formatter'>
    }
})

// need to also create a `sys_ui_form_section` record for each section to associate it with the proper form
const example_form_section = Record({
    $id: '', // string, unique id for the record, typically using Now.ID["value"]
    table: 'sys_ui_form_section', // string, must always leave as 'sys_ui_form_section'
    data: {
        sysUiForm: example_form, // string, the form to display the section on
        sysUiSection: example_section, // string, the section to display
        position: 0 // number, the position of the section on the form
    }
})

// spec to create a View (`sys_ui_view`) in Fluent. Views are a container for forms, sections, and lists, and can be associated with a specific user or roles
const example_view = Record({
    $id: '', // string, unique id for the record, typically using Now.ID["value"]
    table: 'sys_ui_view', // string, must always leave as 'sys_ui_view'
    data: {
        name: '', // string, the system name of the view
        title: '', // string, the customer-facing label of the view
        user: '', // string, optional, the user to apply the view to
        roles: '' // string, optional, comma-separated list of the roles to apply the view to
    }
});
```
