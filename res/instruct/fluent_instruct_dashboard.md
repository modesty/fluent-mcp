# Instructions for Fluent Dashboard API
Always reference the Dashboard API specification for more details.
1. `name` is mandatory. `tabs` and `visibilities` are the two most commonly used optional fields alongside it.
2. Every `tab` in `tabs`, every `widget` in `widgets`, and every item in `visibilities` and `permissions` requires its own `$id` using `Now.ID`. Missing `$id` on any nested object causes a build error.
3. Widget `position` uses a grid coordinate system where `x` and `y` are 0-based grid indices. The grid is typically 24 units wide. Widgets with overlapping positions will overlap on the rendered dashboard — plan positions carefully.
4. Widget `height` and `width` are in grid units. A full-width widget uses `width: 24`. Common sizes: `6x6` (quarter), `12x6` (half-width), `24x8` (full-width banner).
5. The `component` string is case-insensitive and uses kebab-case. Use built-in component names (e.g., `'line'`, `'pie'`, `'single-score'`) or a sys_id string for custom components.
6. `componentProps` contains the component-specific configuration as a JSON object — the exact properties depend on the component type. For report-based components, this typically includes a `reportId` or `reportSysId` property.
7. To link a dashboard to a Workspace, add a `visibilities` entry referencing the exported `Workspace` object: `{ $id: Now.ID['vis_id'], experience: myWorkspace }`. This makes the dashboard accessible within the workspace.
8. `permissions` entries are mutually exclusive on the subject: provide exactly one of `user`, `group`, or `role` per permission object. Mixing multiple subjects in one entry causes a build error.
9. Use `topLayout.widgets` for content that appears above all tabs (e.g., a header widget or KPI summary). When there are no tabs, all widgets go in `topLayout`.
10. Import from `@servicenow/sdk/core`: `import { Dashboard } from '@servicenow/sdk/core'`.
