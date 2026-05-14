# Function: Workspace(config)

Creates a Workspace — a configurable agent or admin experience in ServiceNow's unified navigation framework (`sys_ux_page_registry`). Workspaces provide a standardized layout for managing business entities through dashboards, lists, and detail forms.

## Parameters

### config

`Workspace`

an object containing the following properties:

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **path** (required): `string`
  The URL path or route associated with this workspace

- **title** (required): `string`
  The display name of the workspace

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **active** (optional): `boolean`
  Whether this workspace is currently active

- **defaultRecordOverrides** (optional): `object`
  When records that are not tracked by the plugin are modified on instance, they are tracked here

- **landingPath** (optional): `string`
  The default landing path for the workspace

- **listConfig** (optional): `string | UxListMenuConfig`
  The List Config for this workspace

- **order** (optional): `number`
  The order the workspace is displayed in the unified nav

- **tables** (optional): `keyof Tables[]`
  The tables associated with this workspace



## Examples

### workspace-basic

```typescript
// Source: packages/api/tests/workspace-plugin/workspace-plugin.test.ts

import { Workspace } from '@servicenow/sdk/core'

export const BasicWorkspaceExample = Workspace({
    $id: Now.ID['basic-workspace'],
    title: 'Test Workspace',
    path: 'test_workspace',
    tables: ['incident', 'problem', 'sys_user'],
})

```

### workspace-with-landing

```typescript
// Source: packages/api/tests/workspace-plugin/workspace-plugin.test.ts

import { Workspace } from '@servicenow/sdk/core'

export const WorkspaceWithLandingExample = Workspace({
    $id: Now.ID['workspace-landing'],
    title: 'Test Workspace',
    path: 'test_workspace',
    landingPath: 'test_home',
    active: false,
    tables: ['incident', 'problem', 'sys_user'],
})

```

### workspace-with-list-config

```typescript
// Source: packages/api/tests/workspace-plugin/workspace-plugin.test.ts
// Also: examples/workspace/src/fluent/index.now.ts

import { Workspace, UxListMenuConfig, Applicability, Role } from '@servicenow/sdk/core'

const role1 = Role({
    name: 'x_snc_works_7.user',
    containsRoles: ['canvas_user'],
})

const role2 = Role({
    name: 'x_snc_works_7.admin',
    containsRoles: ['canvas_admin'],
})

const applicability = Applicability({
    $id: Now.ID['workspace_applicability'],
    name: 'Workspace Audience',
    roles: [role1, role2],
})

const listConfig = UxListMenuConfig({
    $id: Now.ID['workspace_list_config'],
    name: 'Workspace List Config',
    description: 'List configuration for workspace',
    categories: [
        {
            $id: Now.ID['incidents_category'],
            title: 'Incidents',
            order: 10,
            lists: [
                {
                    $id: Now.ID['incidents_open'],
                    title: 'Open',
                    order: 10,
                    condition: 'active=true^EQ',
                    table: 'incident',
                    columns: 'number,short_description,priority,state',
                    applicabilities: [
                        {
                            $id: Now.ID['incidents_open_applicability'],
                            applicability: applicability,
                        },
                    ],
                },
            ],
        },
    ],
})

export const WorkspaceWithListConfigExample = Workspace({
    $id: Now.ID['workspace-with-list'],
    title: "Kevin's Grass 3",
    path: 'kevins-grass3',
    landingPath: 'home',
    tables: ['incident', 'problem', 'sys_user'],
    listConfig: listConfig,
})

```

