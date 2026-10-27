# Instructions for Fluent Form API
Always reference the Form API specifications for more details.

## `Form()` API (primary — publicly supported as of SDK v4.6.0)
1. As of SDK v4.6.0, the declarative `Form()` API is publicly exported from `@servicenow/sdk/core`. Prefer it for new development. Import: `import { Form, default_view } from '@servicenow/sdk/core'`.
2. The `Form()` function takes a single configuration object with `table` (mandatory), `view` (mandatory), and `sections` (mandatory, at least one). Optional properties include `user` and `roles`.
3. Each section has a `caption` (string, must be non-empty) and `content` (array of layout blocks). The first section caption is typically an empty-looking name like the table name; subsequent sections have descriptive captions.
4. Layout blocks define the column structure: use `{ layout: 'one-column', elements: [...] }` for single-column layouts and `{ layout: 'two-column', leftElements: [...], rightElements: [...] }` for side-by-side layouts. A section can mix both layout types.
5. Each element in a layout block must specify its `type`: `'table_field'` for standard fields (with `field` property matching a column name), `'annotation'` for informational text, `'formatter'` for special UI components, or `'list'` for related lists.
6. For two-column layouts, use `leftElements` and `rightElements` arrays. This replaces the manual `.begin_split` / `.split` / `.end_split` element approach used in the Record API.
7. For annotations, provide `annotationId` (a `Now.ID` key), `text`, and optionally `annotationType` (e.g., `'Info_Box_Blue'`) and `isPlainText` (defaults to `true`).
8. For formatters, provide `formatterRef` (e.g., `'Activities_Filtered'`, a sys_id, or a project `Record<'sys_ui_formatter'>`). `formatterName` is derived from a predefined `Formatter` key or from the project formatter record's `formatter` field; it is required only when `formatterRef` is the sys_id of a formatter that is not predefined. If you set it, it overrides the record's `formatter` field with no diagnostic, so keep them identical. Prefer a built-in formatter when one fits.
   - **SDK v4.14.0 — custom formatter macros are supported** (earlier guidance said never to create them). Create the macro with `UiMacro()`, then a `Record({ table: 'sys_ui_formatter' })` whose `formatter` is the macro's file name, then reference that record from the `Form()` formatter element. In an app scope the file name must be the **scoped** one, `x_myapp_<name>.xml`; in global, and for every out-of-box macro, it is the unprefixed `<name>.xml`. Nothing prefixes it for you, and an unprefixed name in a scoped app builds cleanly but silently renders nothing. The macro's output is inserted inside the form's table, so it must emit `<tr><td colspan="2">…</td></tr>`, never a top-level `<div>`. See the `form-formatters-guide` and `ui-macro-guide` topics.
9. For related lists, specify `listType` (`'12M'`, `'M2M'`, or `'custom'`) and `listRef` (dot-notation like `'task_sla.task'` for 12M, or a `sys_relationship` reference for custom).
10. Use `default_view` (imported from `@servicenow/sdk/core`) as the `view` value to target the default form view. For custom views, pass a view name string or a `Record<'sys_ui_view'>` reference.
11. The `Form()` API automatically creates all underlying ServiceNow records (`sys_ui_form`, `sys_ui_form_section`, `sys_ui_section`, `sys_ui_element`, `sys_ui_annotation`). You do not need to manually create these records.
12. Exclude any scripts or duplicate code from your output unless explicitly instructed in the prompt.
13. Do not add `sys_id` field as element records unless explicitly instructed in the prompt.

## Fallback: `Record`-based approach
The `Record` plugin approach remains supported as a lower-level fallback. Use it only when modifying existing forms built that way, or when `Form()` does not cover your specific case. When using it:
- You must manually create individual records for `sys_ui_view`, `sys_ui_form`, `sys_ui_section`, `sys_ui_form_section`, and `sys_ui_element`.
- Each `sys_ui_section` in the form MUST have a corresponding `sys_ui_form_section` record to link it.
- Column breaks require manual `.split` / `.end_split` type elements.
