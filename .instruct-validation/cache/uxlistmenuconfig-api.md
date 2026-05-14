# Function: UxListMenuConfig(config)

Configures list menus for workspaces, defining categories of lists with table bindings, column layouts, conditions, and applicability rules (`sys_ux_list_menu_config`). List menus power the navigation and data views within configurable workspaces.

## Parameters

### config

`UxListMenuConfig`

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **active** (optional): `boolean`

- **categories** (optional): `UxListCategory[]`
  Array of list categories that organize lists into logical groups. Each `UxListCategory` has:
  - **$id** (required): unique identifier for the category
  - **title** (required): `string` -- display name of the category shown in workspace navigation
  - **active** (optional): `boolean` -- whether the category is visible to users
  - **order** (optional): `number` -- sort order of the category (lower values appear first)
  - **description** (optional): `string` -- descriptive text for the category
  - **lists** (required): `UxList[]` -- array of list definitions within this category (see below)

- **description** (optional): `string`



### UxList

Each list definition within a category. Lists bind to a ServiceNow table and configure how records are displayed in workspace navigation.

**Core properties:**

- **$id** (required): unique identifier for the list
- **table** (required): `string` -- name of the ServiceNow table this list displays records from (e.g., `'incident'`, `'problem'`)
- **title** (required): `string` -- display title shown in the workspace navigation
- **order** (optional): `number` -- sort order within the parent category (lower values appear first)
- **active** (optional): `boolean` -- whether the list is visible to users
- **columns** (optional): `string` -- comma-separated list of column field names to display (e.g., `'number,short_description,priority,state'`)
- **condition** (optional): `string` -- encoded query to filter which records appear (e.g., `'active=true^EQ'`). Empty string shows all records.
- **fixedQuery** (optional): `string` -- a fixed query applied to the list table that users cannot modify
- **view** (optional): `string` -- reference to a specific list view to apply

**Grouping and scrolling:**

- **groupByColumn** (optional): `string` -- column name to group records by
- **enableInfiniteScroll** (optional): `boolean` -- use infinite scroll instead of pagination

**Access control:**

- **roles** (optional): `string` -- comma-separated list of roles that can access this list
- **groups** (optional): `string` -- user groups that can access this list
- **applicabilities** (optional): `UxListApplicability[]` -- role-based applicability rules (each with `$id`, `active`, `applicability` reference, and optional `order`)

**Display customization:**

- **maxCharacters** (optional): `number` -- maximum characters to display in cells before truncating
- **wordWrap** (optional): `boolean` -- enable word wrapping in cells
- **overrideWordWrapUserPref** (optional): `boolean` -- override the user's word wrap preference
- **highlightContentColor** (optional): `string` -- color for content highlighting
- **highlightContentPattern** (optional): `string` -- regex pattern to match content for highlighting
- **listAttributes** (optional): `string` -- additional list attributes for customization
- **liveUpdates** (optional): `string` -- configuration for live updates of the list

Additional display customization properties (`hide*` flags for pagination, columns, headers, inline editing, etc.) are available -- see the TypeScript type definition for the complete list.


## Examples

### ux-list-menu-config-basic

```typescript
// Source: packages/api/tests/ux-list-menu-config-plugin/ux-list-menu-config-plugin.test.ts

import { UxListMenuConfig } from '@servicenow/sdk/core'

export const BasicListMenuConfigExample = UxListMenuConfig({
    $id: Now.ID['basic-config'],
    name: 'Test List Menu Config',
    description: 'Test description',
    categories: [
        {
            $id: Now.ID['category-1'],
            title: 'Category 1',
            order: 100,
            description: 'Category description',
            lists: [
                {
                    $id: Now.ID['incidents-list'],
                    table: 'incident',
                    title: 'Incidents',
                    order: 100,
                    columns: 'number,short_description,priority',
                    condition: 'active=true',
                },
            ],
        },
    ],
})

```

### ux-list-menu-config-with-applicabilities

```typescript
// Source: examples/workspace/src/fluent/index.now.ts
import { Applicability, Role, UxListMenuConfig } from '@servicenow/sdk/core'

const userRole = Role({
    name: 'x_snc_works_7.user',
    containsRoles: ['canvas_user'],
})

const applicability = Applicability({
    $id: Now.ID['workspace_applicability'],
    name: 'Workspace Audience',
    roles: [userRole],
})

UxListMenuConfig({
    $id: Now.ID['list_config_with_applicabilities'],
    name: 'Workspace List Config',
    description: 'List config with role-based applicabilities',
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

```

### ux-list-menu-config-with-conditions

```typescript
// Source: packages/api/tests/ux-list-menu-config-plugin/ux-list-menu-config-plugin.test.ts
// Also: examples/ux-list/src/fluent/index.now.ts

import { UxListMenuConfig } from '@servicenow/sdk/core'

export const ListMenuConfigWithConditionsExample = UxListMenuConfig({
    $id: Now.ID['conditions-config'],
    name: 'Multi Category Config',
    categories: [
        {
            $id: Now.ID['incidents-category'],
            title: 'Incidents',
            order: 100,
            lists: [
                {
                    $id: Now.ID['incidents-open'],
                    table: 'incident',
                    title: 'Open',
                    order: 10,
                    condition: 'active=true^EQ',
                    columns: 'number,short_description,priority,state',
                },
                {
                    $id: Now.ID['incidents-all'],
                    table: 'incident',
                    title: 'All',
                    order: 20,
                    condition: '',
                    columns: 'number,short_description,priority,state',
                },
            ],
        },
        {
            $id: Now.ID['problems-category'],
            title: 'Problems',
            order: 200,
            lists: [
                {
                    $id: Now.ID['problems-open'],
                    table: 'problem',
                    title: 'Open',
                    order: 10,
                    condition: 'active=true^EQ',
                    columns: 'number,short_description,state,assignment_group,assigned_to',
                },
            ],
        },
    ],
})

```

