
# Creating Workspaces Guide

Guide for creating ServiceNow Workspaces -- complete out-of-the-box solutions for managing business entities through standardized CRUD workflows. A workspace automatically generates a dashboard page, list management views, and detailed forms following ServiceNow's standard UX patterns.

## When to Use

- When creating new workspaces
- When the user asks about workspace configuration or best practices
- When building a full business process interface with dashboard, list management, and detail forms

## What is a Workspace?

A Workspace automatically generates a complete set of pages for managing a business entity:

- **Dashboard Page**: Overview dashboard with key metrics and recent activity
- **List Page**: Searchable, filterable table view with bulk operations
- **Detail/Form Page**: Full CRUD form with related records and actions

## Instructions

### Step 1: Understand the Requirement

- Identify the required tables.
  - First, check whether they already exist on the platform.
  - If not, look for them within the project.
  - Create new tables only if they cannot be found in either location.
- Gather details about the tables' columns.

### Step 2: Configure the UX List Menu

Create a `UxListMenuConfig` inside `list-menu.now.ts` defining the navigation structure and list views.

### Step 3: Configure the Workspace

Create a `Workspace` in `workspace.now.ts`:
- Ensure you also create an ACL to secure the workspace route.
- Associate the UX List Menu configuration to the workspace.

### Step 4: Configure the Dashboard (Mandatory)

Create a `Dashboard` inside `dashboard.now.ts`:
- Associate the dashboard to the workspace via visibilities.
- The dashboard is mandatory for the workspace to function correctly.

### Step 5: Verify Integration

- Ensure the `UxListMenuConfig` is properly referenced in the workspace.
- Verify that the workspace is referenced in dashboard visibilities.
- Confirm ACL field matches workspace path pattern: `{path}.*`
- Check that all roles are properly defined and referenced.

### Step 6: Build, Install, and Provide Summary

After building and installing, read `src/fluent/generated/keys.ts` to extract the actual sys_id from `sys_ux_page_registry` for the workspace. Provide the user with:
- A clickable URL to access the workspace: `/now/{path}/{landingPath}`
- A clickable URL to edit in UI Builder: `/now/builder/ui/experience/{workspace_sys_id}`

## File Organization

```
src/
  fluent/
    workspaces/
      incident-tracker/
        workspace.now.ts
        list-menu.now.ts
        dashboard.now.ts
```

## Workspace URL Structure

```
/now/{path}/{landingPath}
```

If `path: 'my-example'`, the URL is `/now/my-example/home` (landingPath defaults to `home`).

---

## Workspace API Reference

### Workspace Properties

For the full property reference, see the `workspace-api` topic.

### Workspace Example

```typescript
import { Workspace, UxListMenuConfig, Acl, Applicability, Role } from '@servicenow/sdk/core';

// 1. Define roles
const userRole = Role({
  $id: Now.ID['asset_workspace_user_role'],
  name: 'x_snc_asset.user',
  containsRoles: ['canvas_user'],
});

// 2. Define applicability
const assetApplicability = Applicability({
  $id: Now.ID['asset_applicability'],
  name: 'Asset Management Users',
  roles: [userRole],
});

// 3. Create list configuration (see UxListMenuConfig section)
const assetListConfig = UxListMenuConfig({ /* ... */ });

// 4. Create workspace
export const assetWorkspace = Workspace({
  $id: Now.ID['asset_management_workspace'],
  title: 'Asset Management',
  path: 'asset-management',
  tables: ['alm_asset', 'cmdb_ci', 'user'],
  listConfig: assetListConfig,
});

// 5. Create ACL -- field MUST match workspace path + .*
Acl({
  $id: Now.ID['asset_management_workspace_ACL'],
  localOrExisting: 'Existing',
  type: 'ux_route',
  operation: 'read',
  roles: ['x_snc_asset.user'],
  table: 'now',
  field: 'asset-management.*',
});
```

---

## UxListMenuConfig API Reference

Defines navigation structure and list views for workspaces -- categories, lists, and role-based visibility.

### UxListMenuConfig Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `name` | `string` | Yes | Name of the list configuration |
| `description` | `string` | No | Description |
| `active` | `boolean` | No | Whether active (default: `true`) |
| `categories` | `UxListCategory[]` | No | Array of categories |

### UxListCategory Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `title` | `string` | Yes | Display title in navigation |
| `order` | `number` | No | Sort order (lower = first) |
| `lists` | `UxList[]` | Yes | Array of lists |

### UxList Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `title` | `string` | Yes | Display title |
| `table` | `string` | Yes | ServiceNow table name |
| `columns` | `string` | No | Comma-separated column names |
| `condition` | `string` | No | Encoded query filter |
| `order` | `number` | No | Sort order within category |
| `applicabilities` | `ListApplicability[]` | No | Role-based visibility |

### Encoded Query Patterns

```typescript
condition: 'active=true^EQ'                                           // Active records
condition: ''                                                          // All records
condition: 'assigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe^EQ'    // Assigned to current user
condition: 'priority=1^ORpriority=2'                                  // High priority
```

### UxListMenuConfig Example

```typescript
const listConfig = UxListMenuConfig({
  $id: Now.ID['itsm_workspace_list_config'],
  name: 'ITSM Workspace List Configuration',
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
          applicabilities: [{
            $id: Now.ID['incidents_open_applicability'],
            applicability: userApplicability,
          }],
        },
        {
          $id: Now.ID['incidents_all'],
          title: 'All',
          order: 20,
          condition: '',
          table: 'incident',
          columns: 'number,short_description,priority,state',
          applicabilities: [{
            $id: Now.ID['incidents_all_applicability'],
            applicability: userApplicability,
          }],
        },
      ],
    },
  ],
});
```

---

## Dashboard API Reference

The Dashboard fluent plugin defines the landing page for workspaces. Dashboards are organized into tabs containing widgets.

### Dashboard Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `name` | `string` | Yes | Display name |
| `tabs` | `DashboardTab[]` | Yes | Array of tabs |
| `visibilities` | `DashboardVisibility[]` | Yes | Links dashboard to workspaces |
| `permissions` | `DashboardPermission[]` | Yes | Access control (can be empty) |

### Widget Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `component` | `string` | Yes | Visualization type |
| `componentProps` | `object` | Yes | Component configuration |
| `height` | `number` | Yes | Height in grid units |
| `width` | `number` | Yes | Width in grid units |
| `position` | `{x, y}` | Yes | Grid position |

### Grid Layout System

Dashboards use a **48-point grid**. Common layouts:

- **Full width**: `{ width: 48, position: { x: 0, y: 0 } }`
- **Three columns**: widths 14, 17, 17 at x positions 0, 14, 31

### Widget Component Types

**Visualizations:**

| Component | Description | Data Type |
|-----------|-------------|-----------|
| `single-score` | Single metric display | Simple |
| `vertical-bar` | Vertical bar chart | Group |
| `horizontal-bar` | Horizontal bar chart | Group |
| `line` | Line chart | Trend |
| `donut` | Donut chart | Group |
| `pie` | Pie chart | Group |
| `area` | Area chart | Trend |
| `dial` | Dial gauge | Simple |

**Supporting widgets:** `heading`, `rich-text`, `image`.

### Data Type Requirements

- **Simple** (single-score, dial, gauge): requires `dataSources` and `metrics` only.
- **Group** (vertical-bar, donut, pie): requires `dataSources`, `metrics`, and `groupBy`.
- **Trend** (line, area, column): requires `dataSources`, `metrics`, and `trendBy`.

### Dashboard Example

```typescript
import { Dashboard } from '@servicenow/sdk/core';

Dashboard({
  $id: Now.ID['incident_dashboard'],
  name: 'Incident Dashboard',
  tabs: [{
    $id: Now.ID['overview_tab'],
    name: 'Overview',
    widgets: [
      {
        $id: Now.ID['open_incidents_widget'],
        component: 'single-score',
        componentProps: {
          dataSources: [{
            label: 'Incident', sourceType: 'table',
            tableOrViewName: 'incident', filterQuery: '',
            id: 'data_source_1',
          }],
          headerTitle: 'Open Incidents',
          metrics: [{
            dataSource: 'data_source_1', id: 'metric_1',
            aggregateFunction: 'COUNT', axisId: 'primary',
          }],
        },
        height: 14, width: 14, position: { x: 0, y: 0 },
      },
      {
        $id: Now.ID['incidents_by_priority_widget'],
        component: 'vertical-bar',
        componentProps: {
          dataSources: [{
            label: 'Incident', sourceType: 'table',
            tableOrViewName: 'incident', filterQuery: '',
            id: 'data_source_1',
          }],
          headerTitle: 'Incidents by Priority',
          metrics: [{
            dataSource: 'data_source_1', id: 'metric_1',
            aggregateFunction: 'COUNT', axisId: 'primary',
          }],
          groupBy: [{
            groupBy: [{ dataSource: 'data_source_1', groupByField: 'priority' }],
            maxNumberOfGroups: 10, showOthers: false,
          }],
          sortBy: 'value',
        },
        height: 14, width: 17, position: { x: 14, y: 0 },
      },
    ],
  }],
  visibilities: [{
    $id: Now.ID['dashboard_visibility'],
    experience: assetWorkspace,
  }],
  permissions: [],
});
```

---

## List API Reference

Configure lists (`sys_ui_list`) and their views.

| Name | Type | Description |
|------|------|-------------|
| `table` | String | Required. Table name for the list. |
| `view` | Reference | Required. UI view identifier or `default_view`. |
| `columns` | ListElement[] | Required. Array of column definitions. |
| `parent` | TableName | Parent table for related lists. |

### List Element

| Field | Type | Mandatory | Description |
|-------|------|-----------|-------------|
| `element` | string | Yes | Field name (supports dot walking) |
| `position` | number | No | Display position (defaults to array order) |

```typescript
import { List } from '@servicenow/sdk/core';

const myList = List({
  table: 'cmdb_ci_server',
  view: app_task_view,
  columns: [
    { element: 'name', position: 0 },
    { element: 'business_unit', position: 1 },
  ],
});
```

## Troubleshooting

### Dashboard Not Appearing
- Verify `visibilities` references the correct workspace.
- Confirm the workspace URL pattern is correct.

### Lists Not Appearing
- Check `active` is true for both category and list.
- Verify applicability includes the user's roles.
- Ensure `listConfig` is referenced in the workspace.

### Workspace Not Accessible
- Check ACL field matches `{workspace.path}.*` exactly.
- Verify users have required roles.

