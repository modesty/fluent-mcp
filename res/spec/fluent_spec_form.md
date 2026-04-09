# **Context:** Form API spec: Used to create a Form (`sys_ui_form`) for a ServiceNow table, defining which sections, layout blocks, and fields to display. The Record-based approach is the primary method. A `Form()` fluent API exists in the SDK type definitions but is not yet publicly exported.

## Record-based approach (primary, publicly supported)

Uses the `Record()` function to create individual form records (`sys_ui_view`, `sys_ui_form`, `sys_ui_section`, `sys_ui_form_section`, `sys_ui_element`). See form snippets for complete examples.

## `Form()` API (internal — not yet exported from `@servicenow/sdk/core`)

The `Form()` function creates all necessary ServiceNow records (`sys_ui_form`, `sys_ui_form_section`, `sys_ui_section`, `sys_ui_element`, `sys_ui_annotation`) from a single declarative configuration. **Note:** This API exists in the SDK type definitions but is not yet re-exported from the public `@servicenow/sdk/core` module as of v4.5.0.

```typescript
import { Form, default_view } from '@servicenow/sdk/core'

// ─── Predefined Constants ───

// AnnotationType — predefined annotation styling types (maps to sys_ui_annotation_type sys_ids)
// Use as annotationType value in AnnotationElement
const AnnotationType = {
    Info_Box_Blue: string,
    Info_Box_Red: string,
    Line_Separator: string,
    Plain_Text: string,
    Section_Details: string,
    Section_Plain_Text: string,
    Section_Separator: string,
    Text: string,
}

// Formatter — predefined formatter references (maps to sys_ui_formatter sys_ids)
// Use as formatterRef value in FormatterElement
const Formatter = {
    Activities_Filtered: string,
    Attached_Knowledge: string,
}

// ─── Form Element Types ───

// TableFieldElement — a standard table column field
type TableFieldElement = {
    field: string,      // mandatory — column name from the table schema (e.g., 'number', 'short_description', 'assigned_to')
    type: 'table_field' // mandatory — must be 'table_field'
}

// AnnotationElement — displays informational text on the form
type AnnotationElement = {
    type: 'annotation',          // mandatory — must be 'annotation'
    annotationId: Now.ID['key'], // mandatory — reference to a sys_ui_annotation record ID
    text: string,                // mandatory — annotation text content
    isPlainText?: boolean,       // optional — true for plain text (default), false for HTML
    annotationType?: string,     // optional — AnnotationType key (e.g., 'Info_Box_Blue'), sys_ui_annotation_type sys_id, or Record<'sys_ui_annotation_type'>
}

// FormatterElement — displays special UI components (e.g., activity streams)
type FormatterElement = {
    type: 'formatter',           // mandatory — must be 'formatter'
    formatterRef: string,        // mandatory — Formatter key (e.g., 'Activities_Filtered'), sys_id, or Record<'sys_ui_formatter'>
    formatterName?: string,      // optional — formatter name (auto-derived from formatterRef for predefined keys)
}

// ListElement — related list element (one-to-many, many-to-many, or custom relationship)
// Implicit list (12M or M2M):
type ImplicitListElement = {
    type: 'list',                // mandatory — must be 'list'
    listType: '12M' | 'M2M',    // mandatory — '12M' for one-to-many, 'M2M' for many-to-many
    listRef: string,             // mandatory — dot-notation: '<table_name>.<column_name>' (e.g., 'task_sla.task' for 12M, 'm2m_task_project.task_ref' for M2M)
}
// Custom relationship list:
type CustomListElement = {
    type: 'list',                // mandatory — must be 'list'
    listType: 'custom',          // mandatory — must be 'custom'
    listRef: string,             // mandatory — sys_relationship sys_id or Record<'sys_relationship'>
}

// FormElement — union of all element types
type FormElement = TableFieldElement | AnnotationElement | FormatterElement | ImplicitListElement | CustomListElement

// ─── Layout Blocks ───

// OneColumnLayout — all elements stacked vertically in a single column
type OneColumnLayout = {
    layout: 'one-column',        // mandatory — must be 'one-column'
    elements: FormElement[],     // mandatory — array of elements in the column
}

// TwoColumnLayout — elements split into left and right columns
// Maps to .begin_split / .split / .end_split element records in ServiceNow
type TwoColumnLayout = {
    layout: 'two-column',        // mandatory — must be 'two-column'
    leftElements: FormElement[], // mandatory — elements in the left column
    rightElements: FormElement[], // mandatory — elements in the right column
}

type LayoutBlock = OneColumnLayout | TwoColumnLayout

// ─── FormSection ───

type FormSection = {
    caption: string,             // mandatory — section header text (must be non-empty)
    header?: boolean,            // optional — whether to render as a header section
    title?: boolean,             // optional — display title for the section (maps to sys_ui_section title, max 40 chars)
    content: LayoutBlock[],      // mandatory — array of layout blocks defining column structure and elements
}

// ─── Form Configuration ───

Form({
    table: '',                   // string (TableName), mandatory — the ServiceNow table (e.g., 'incident', 'sn_my_app_my_table')
    view: '',                    // string | Record<'sys_ui_view'>, mandatory — view name or reference. Use `default_view` for the default view
    user: '',                    // string | Record<'sys_user'>, optional — personalize the form for a specific user
    roles: [],                   // (string | Role)[], optional — role names or Role objects that can access this form
    sections: [                  // FormSection[], mandatory — at least one section required
        {
            caption: '',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'number', type: 'table_field' },
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
    ],
}): Form
```

## Legacy API: `Record`-based approach

The `Record` plugin can still be used as a lower-level fallback when the `Form()` API is not suitable. This approach requires manually creating individual records for `sys_ui_form`, `sys_ui_section`, `sys_ui_form_section`, `sys_ui_element`, and `sys_ui_view`.

```typescript
import { Record } from '@servicenow/sdk/core'

// Create a View
const example_view = Record({
    $id: Now.ID['my_view'],
    table: 'sys_ui_view',
    data: {
        name: '',      // string — system name of the view
        title: '',     // string — display label of the view
        user: '',      // string, optional — user to apply the view to
        roles: ''      // string, optional — comma-separated role names
    }
})

// Create a Form
const example_form = Record({
    $id: Now.ID['my_form'],
    table: 'sys_ui_form',
    data: {
        name: '',      // string — table name the form is for
        view: example_view, // Record<'sys_ui_view'> | sys_id string | default_view
        sysUser: ''    // string, optional — user to apply the form to
    }
})

// Create a Section
const example_section = Record({
    $id: Now.ID['my_section'],
    table: 'sys_ui_section',
    data: {
        name: '',      // string — table name the section is for
        table: '',     // string — table name
        view: example_view, // Record<'sys_ui_view'> | sys_id string | default_view
        caption: ''    // string, optional — section title
    }
})

// Link Section to Form (required for each section)
Record({
    $id: Now.ID['my_form_section'],
    table: 'sys_ui_form_section',
    data: {
        sysUiForm: example_form,     // Record<'sys_ui_form'>
        sysUiSection: example_section, // Record<'sys_ui_section'>
        position: 0                  // number — order of section on the form
    }
})

// Create Form Elements (fields within a section)
Record({
    $id: Now.ID['my_element'],
    table: 'sys_ui_element',
    data: {
        element: '',   // string — field name (e.g., 'number') or special name ('.split', '.end_split')
        position: 0,   // number — order within the section
        type: 'element', // string, optional — 'element'|'list'|'annotation'|'formatter'|'.split'|'.begin_split'|'.end_split'
        sysUiSection: example_section, // Record<'sys_ui_section'>
        sysUiFormatter: ''  // optional — sys_id | Record<'sys_ui_formatter'>
    }
})
```
