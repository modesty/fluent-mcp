# Function: Dashboard(config)

Creates a Dashboard -- a configurable layout of widgets organized into tabs for data visualization and reporting (`par_dashboard`). Dashboards support drag-and-drop widget positioning, tab-based organization, role-based permissions, and group/user visibility controls.

## Usage

```typescript
Dashboard({
  $id: Now.ID['my-dashboard'],
  name: 'My Dashboard',
  tabs: [
    {
      $id: Now.ID['tab-1'],
      name: 'Overview',
      widgets: [
        {
          $id: Now.ID['widget-1'],
          component: 'component-id',
          componentProps: { key: 'value' },
          height: 12,
          width: 12,
          position: {
             x: 0,
             y: 0,
         }
        },
      ],
    },
  ],
  permissions: [
    {
      $id: Now.ID['perm-1'],
      user: 'user-sys-id',
      canRead: true,
      canWrite: true,
      canShare: true,
      owner: true,
    },
  ],
  visibilities: [],
})
```
## Parameters

### config

`Dashboard`

an object containing the following properties:

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`
  Name of the dashboard

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **active** (optional): `boolean`
  Whether the dashboard is active (defaults to true)

- **permissions** (optional): `DashboardPermission[]`
  Array of permission entries controlling who can access the dashboard. Each `DashboardPermission` uses a discriminated union -- exactly one of `user`, `group`, or `role` must be set to identify the subject:
  - **$id** (required): unique identifier for the permission entry
  - **user**: `string | Record<'sys_user'>` -- grant permission to a specific user (mutually exclusive with group/role)
  - **group**: `string | Record<'sys_user_group'>` -- grant permission to a user group (mutually exclusive with user/role)
  - **role**: `string | Record<'sys_user_role'>` -- grant permission to a role (mutually exclusive with user/group)
  - **canRead** (optional): `boolean` -- whether the subject can view the dashboard (defaults to true)
  - **canWrite** (optional): `boolean` -- whether the subject can edit the dashboard (defaults to false)
  - **canShare** (optional): `boolean` -- whether the subject can share the dashboard (defaults to false)
  - **owner** (optional): `boolean` -- whether the subject is an owner of the dashboard (defaults to false)

- **tabs** (optional): `DashboardTab[]`
  Array of tabs in the dashboard. Each `DashboardTab` has:
  - **$id** (required): unique identifier for the tab
  - **name** (required): `string` -- display name of the tab
  - **active** (optional): `boolean` -- whether the tab is visible (defaults to true)
  - **widgets** (required): `DashboardWidget[]` -- array of widgets placed in this tab (see below)

- **topLayout** (optional): `DashboardTopLayout`
  Array of top-level widgets (displayed outside of tabs). Contains a `widgets` array of `DashboardWidget` objects.

- **visibilities** (optional): `DashboardVisibility[]`
  Array of visibility rules controlling which UX experiences can display this dashboard. Each `DashboardVisibility` has:
  - **$id** (required): unique identifier for the visibility rule
  - **experience** (required): `string | Workspace` -- reference to a UX experience (sys_id string or `Workspace` reference to `sys_ux_page_registry`)


### DashboardWidget

Each widget placed in a tab or top layout. Widgets represent individual visual components positioned on a grid.

- **$id** (required): unique identifier for the widget
- **component** (required): `string` -- component identifier, either a human-readable name in kebab-case (e.g., `'line'`, `'pie'`, `'single-score'`, `'vertical-bar'`, `'donut'`, `'gauge'`, `'list'`, `'rich-text'`, `'image'`, `'heading'`) or a component sys_id (32-character hex string). Component names are case-insensitive.
- **componentProps** (required): `Record<string, unknown>` -- key-value pairs of configuration properties passed to the component (varies by component type)
- **height** (required): `number` -- height of the widget in grid units
- **width** (required): `number` -- width of the widget in grid units
- **position** (required): `object` -- grid placement coordinates
  - **x**: `number` -- horizontal position (column offset, 0-based)
  - **y**: `number` -- vertical position (row offset, 0-based)


## See

- https://docs.servicenow.com/csh?topicname=dashboard-api-now-ts.html&version=latest


## Examples

### dashboard-basic

```typescript
// Source: packages/api/tests/dashboard-plugin/dashboard-plugin.test.ts

import { Dashboard } from '@servicenow/sdk/core'

export const BasicDashboardExample = Dashboard({
    $id: Now.ID['basic-dashboard'],
    name: 'Test Dashboard',
    tabs: [
        {
            $id: Now.ID['overview-tab'],
            name: 'Overview',
            widgets: [
                {
                    $id: Now.ID['widget-1'],
                    component: '23051643b7e03010097cb81cde11a910',
                    componentProps: {
                        selectedElements: [],
                        chartVariation: 'stacked',
                    },
                    height: 12,
                    width: 12,
                    position: { x: 0, y: 0 },
                },
            ],
        },
    ],
    visibilities: [],
    permissions: [],
})

```

### dashboard-with-permissions

```typescript
// Source: packages/api/tests/dashboard-plugin/dashboard-plugin.test.ts

import { Dashboard } from '@servicenow/sdk/core'

export const DashboardWithPermissionsExample = Dashboard({
    $id: Now.ID['secure-dashboard'],
    name: 'Secure Dashboard',
    tabs: [],
    visibilities: [],
    permissions: [
        {
            $id: Now.ID['user-permission'],
            canRead: true,
            canShare: true,
            canWrite: true,
            owner: true,
            user: Now.ref('sys_user', { sys_id: '6816f79cc0a8016401c5a33be04be441' }),
        },
        {
            $id: Now.ID['group-permission'],
            group: Now.ref('sys_user_group', { sys_id: 'abc123def456group' }),
            canRead: true,
            canWrite: false,
            canShare: false,
            owner: false,
        },
        {
            $id: Now.ID['role-permission'],
            role: Now.ref('sys_user_role', { sys_id: 'xyz789abc012role' }),
            canRead: true,
            canWrite: true,
            canShare: false,
            owner: false,
        },
    ],
})

```

### dashboard-with-visibilities

```typescript
// Source: packages/api/tests/dashboard-plugin/dashboard-plugin.test.ts

import { Dashboard } from '@servicenow/sdk/core'

export const DashboardWithVisibilitiesExample = Dashboard({
    $id: Now.ID['visible-dashboard'],
    name: 'Visible Dashboard',
    tabs: [],
    visibilities: [
        {
            $id: Now.ID['visibility-1'],
            experience: Now.ref('sys_ux_page_registry', { sys_id: 'abc123def456789' }),
        },
    ],
    permissions: [],
})

```

