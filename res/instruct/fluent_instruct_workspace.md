# Instructions for Fluent Workspace API
Always reference the Workspace API specification for more details.
1. Three related functions work together: `Applicability` defines role-based access, `UxListMenuConfig` defines navigation structure, and `Workspace` ties them all together. Define them in this order and export each as a named constant.
2. `Workspace.path` must be a URL-safe string (lowercase, hyphens, no spaces) — e.g., `'incident-management'`. This becomes the workspace URL and must be unique within the instance.
3. The `tables` array on `Workspace` registers which ServiceNow tables the workspace integrates with. This enables automatic list/detail page generation for those tables.
4. Build navigation with `UxListMenuConfig` by nesting `categories` → `lists`. Each category is a section header, and each list within it becomes a navigation link showing filtered records from a specific table.
5. Use `UxList.condition` with ServiceNow encoded query format to filter which records appear in each list — e.g., `'active=true^state=1^EQ'` for open records. Use `UxList.columns` as a comma-separated string of column names to control which fields are shown.
6. `Applicability` controls which users see each navigation list. Always assign applicability objects to named exports before referencing them in `UxList.applicabilities`. Roles can be provided as `Role` object references or as sys_id strings.
7. A `Workspace` can be linked to a `Dashboard` via `Dashboard.visibilities[].experience` — this makes the dashboard visible within the workspace context.
8. `Workspace.landingPath` can point to a specific route within the workspace (e.g., a specific list or detail page) to set the default landing page.
9. Each list, category, and applicability within a `UxListMenuConfig` requires its own `$id` using `Now.ID`. Omitting `$id` from nested objects causes build errors.
10. Import all three functions from `@servicenow/sdk/core`: `import { Workspace, UxListMenuConfig, Applicability } from '@servicenow/sdk/core'`.
