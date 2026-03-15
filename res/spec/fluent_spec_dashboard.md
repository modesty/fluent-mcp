# **Context:** Dashboard API spec: Used to create a ServiceNow Dashboard (`par_dashboard`) — a configurable analytics and reporting page organized into tabs with positioned widgets. Dashboards can be linked to Workspaces via visibility rules.

```typescript
import { Dashboard } from '@servicenow/sdk/core'

// Creates a new Dashboard (`par_dashboard`)
Dashboard({
    $id: Now.ID['my_dashboard'], // string | Now.ID key, mandatory — unique identifier

    // ─── Core fields ───
    name: '',               // string, mandatory — display name of the dashboard
    active: true,           // boolean, optional — whether the dashboard is active, default: true

    // ─── Top-level widgets (outside any tab) ───
    topLayout: {            // DashboardTopLayout, optional — widgets displayed above all tabs
        widgets: [          // DashboardWidget[], optional
            // see widget definition below
        ],
    },

    // ─── Tabs ───
    tabs: [                 // DashboardTab[], optional — tabbed sections of the dashboard
        {
            $id: Now.ID['tab_overview'], // mandatory for each tab
            name: '',       // string, mandatory — tab label
            active: true,   // boolean, optional — whether the tab is visible, default: true
            widgets: [      // DashboardWidget[], mandatory — widgets in this tab
                // see widget definition below
            ],
        }
    ],

    // ─── Widgets (used inside tabs[].widgets or topLayout.widgets) ───
    // DashboardWidget structure:
    // {
    //     $id: Now.ID['widget_id'], // mandatory for each widget
    //     component: 'line',  // string, mandatory — widget component type (see list below)
    //     componentProps: {}, // Record<string, unknown>, mandatory — component-specific configuration
    //     height: 12,         // number, mandatory — widget height in grid units
    //     width: 12,          // number, mandatory — widget width in grid units (max 24)
    //     position: {
    //         x: 0,           // number, mandatory — x position in grid (0-based)
    //         y: 0,           // number, mandatory — y position in grid (0-based)
    //     },
    // }

    // Available component types:
    // 'area'               — Area chart
    // 'boxplot'            — Box plot chart
    // 'bubble'             — Bubble chart
    // 'calendar-report'    — Calendar-based report view
    // 'column'             — Column/bar chart
    // 'dial'               — Dial/gauge meter
    // 'donut'              — Donut chart
    // 'gauge'              — Gauge chart
    // 'geomap'             — Geographic map
    // 'heading'            — Section heading/title widget
    // 'heatmap'            — Heat map
    // 'horizontal-bar'     — Horizontal bar chart
    // 'image'              — Static image widget
    // 'indicator-scorecard'— KPI scorecard
    // 'line'               — Line chart
    // 'list'               — Record list widget
    // 'pareto'             — Pareto chart
    // 'pie'                — Pie chart
    // 'pivot-table'        — Pivot table
    // 'rich-text'          — Rich text/HTML content widget
    // 'scatter'            — Scatter plot
    // 'semi-donut'         — Semi-donut chart
    // 'single-score'       — Single metric score display
    // 'spline'             — Spline (curved line) chart
    // 'step'               — Step chart
    // 'vertical-bar'       — Vertical bar chart
    // string               — Custom component sys_id

    // ─── Visibilities ───
    visibilities: [         // DashboardVisibility[], optional — links dashboard to experiences (e.g., Workspaces)
        {
            $id: Now.ID['visibility_id'], // mandatory
            experience: workspaceObject, // string | Workspace, mandatory — workspace or sys_ux_page_registry reference
        }
    ],

    // ─── Permissions ───
    permissions: [          // DashboardPermission[], optional — user/group/role-level access control
        {
            $id: Now.ID['permission_id'], // mandatory
            // Provide exactly one of: user, group, or role (mutually exclusive)
            user: '',       // string | Record<'sys_user'>, optional — specific user
            group: '',      // string | Record<'sys_user_group'>, optional — user group
            role: '',       // string | Record<'sys_user_role'>, optional — role
            // Access flags:
            canRead: true,  // boolean, optional — read access, default: true
            canWrite: false, // boolean, optional — edit access, default: false
            canShare: false, // boolean, optional — share access, default: false
            owner: false,   // boolean, optional — owner flag, default: false
        }
    ],
}): Dashboard // returns a Dashboard object
```
