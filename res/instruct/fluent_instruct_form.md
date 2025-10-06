# Instructions for Fluent Form and Section API
Always reference the Form API specifications for more details.
1. First, create a new `sys_ui_view` record or import `default_view` from `@servicenow/sdk/core`
2. To create a new Form view from scratch, you must utilize ALL of the following types of records: `sys_ui_form`, `sys_ui_section`, `sys_ui_form_section`, and `sys_ui_element`
    - `sys_ui_form` is a container for multiple form sections
    - `sys_ui_section` is a reusable container for form elements
    - `sys_ui_form_section` tracks the m2m relationships between sections and forms. Each section in the form MUST have a corresponding `sys_ui_form_section` record
    - `sys_ui_element` tracks the fields that will be displayed in a section
3. Typically, the first section in a form has no `caption`, but the following sections do have a `caption` that serves as a section title
4. `sys_ui_element` records usually store ordinary fields. However, you can also add column breaks between fields by using `.split` and `.end_split`.
5. Exclude any scripts or duplicate code from your output unless explicitly instructed in the prompt.
6. Do not add `sys_id` field as element records in `sys_ui_element` unless explicitly instructed in the prompt.