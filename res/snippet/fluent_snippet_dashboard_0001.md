# Incident management dashboard: two tabs on the 48-column grid with inline-bound widgets — heading, KPI scores, category chart, trend chart, and grouped list — plus role permissions

```typescript
import { Dashboard } from '@servicenow/sdk/core'

// All data binding is inline in componentProps (dataSources + metrics + groupBy / trendBy);
// there is no separate report record. Widths/x use a 48-column grid: full = 48, half = 24, quarter = 12.
export const incidentManagementDashboard = Dashboard({
    $id: Now.ID['incident_management_dashboard'],
    name: 'Incident Management Dashboard',
    description: 'Open incident volume, priority mix, and intake trend',
    active: true,

    tabs: [
        // ─── Overview tab ───
        {
            $id: Now.ID['dashboard_overview_tab'],
            name: 'Overview',
            active: true,
            widgets: [
                // Section heading — static widget, title key is `label`
                {
                    $id: Now.ID['overview_heading'],
                    component: 'heading',
                    componentProps: { label: 'Incident overview', variant: 'header-secondary', level: '1' },
                    height: 3,
                    width: 48,
                    position: { x: 0, y: 0 },
                },
                // Open incidents — single value: metrics only, no groupBy; showZero so 0 renders as "0"
                {
                    $id: Now.ID['open_incidents_kpi'],
                    component: 'single-score',
                    componentProps: {
                        headerTitle: 'Open incidents',
                        dataSources: [{ sourceType: 'table', tableOrViewName: 'incident', filterQuery: 'active=true', id: 'ds_1' }],
                        metrics: [{ dataSource: 'ds_1', aggregateFunction: 'COUNT', axisId: 'primary' }],
                        showZero: true,
                    },
                    height: 7,
                    width: 12,
                    position: { x: 0, y: 3 },
                },
                // Critical (P1) incidents — same wiring, narrower filterQuery
                {
                    $id: Now.ID['p1_incidents_kpi'],
                    component: 'single-score',
                    componentProps: {
                        headerTitle: 'Critical (P1) incidents',
                        dataSources: [{ sourceType: 'table', tableOrViewName: 'incident', filterQuery: 'active=true^priority=1', id: 'ds_1' }],
                        metrics: [{ dataSource: 'ds_1', aggregateFunction: 'COUNT', axisId: 'primary' }],
                        showZero: true,
                    },
                    height: 7,
                    width: 12,
                    position: { x: 12, y: 3 },
                },
                // Incidents by priority — category chart: ONE groupBy entry + metrics
                {
                    $id: Now.ID['incidents_by_priority_chart'],
                    component: 'pie',
                    componentProps: {
                        headerTitle: 'Incidents by priority',
                        dataSources: [{ sourceType: 'table', tableOrViewName: 'incident', filterQuery: 'active=true', id: 'ds_1' }],
                        groupBy: [
                            {
                                groupBy: [{ dataSource: 'ds_1', groupByField: 'priority', isChoice: true }],
                                maxNumberOfGroups: 'ALL',
                                sortBy: 'value',
                                sortByOrder: 'desc',
                            },
                        ],
                        metrics: [{ dataSource: 'ds_1', aggregateFunction: 'COUNT', axisId: 'primary' }],
                        showLegend: true,
                        legendPosition: 'bottom',
                    },
                    height: 14,
                    width: 24,
                    position: { x: 24, y: 3 },
                },
                // Incident intake over time — time-trend chart: metrics[].id + trendBy (not a category groupBy)
                {
                    $id: Now.ID['incidents_trend_chart'],
                    component: 'line',
                    componentProps: {
                        headerTitle: 'Incidents opened',
                        dataSources: [{ sourceType: 'table', tableOrViewName: 'incident', filterQuery: 'active=true', id: 'ds_1' }],
                        metrics: [{ dataSource: 'ds_1', aggregateFunction: 'COUNT', axisId: 'primary', id: 'metric_1' }],
                        trendBy: { trendByFrequency: 'date', trendByFields: [{ field: 'sys_created_on', metric: 'metric_1' }] },
                    },
                    height: 12,
                    width: 48,
                    position: { x: 0, y: 17 },
                },
            ],
        },
        // ─── Active incidents tab ───
        {
            $id: Now.ID['dashboard_active_tab'],
            name: 'Active Incidents',
            active: true,
            widgets: [
                // Grouped list — aggregation-capable 'list': title headerTitle, show* toggles,
                // columns is ONE comma-separated string, sort via ^ORDERBYDESC<field> in the query
                {
                    $id: Now.ID['active_incidents_list_widget'],
                    component: 'list',
                    componentProps: {
                        headerTitle: 'Active incidents by priority',
                        table: 'incident',
                        dataSources: [{ sourceType: 'table', tableOrViewName: 'incident', filterQuery: 'active=true^ORDERBYDESCsys_created_on', id: 'ds_1' }],
                        metrics: [{ dataSource: 'ds_1', aggregateFunction: 'COUNT', axisId: 'primary' }],
                        groupByField: 'priority',
                        columns: 'number,short_description,priority,state,assigned_to',
                        limit: 20,
                        showLinks: true,
                        showViewAll: true,
                        showColumnSorting: true,
                    },
                    height: 20,
                    width: 48,
                    position: { x: 0, y: 0 },
                },
            ],
        },
    ],

    // To show this dashboard inside a workspace, add a visibility that references the exported Workspace object:
    // visibilities: [{ $id: Now.ID['dashboard_workspace_visibility'], experience: incidentManagementWorkspace }],
    visibilities: [],

    // Permissions: exactly one subject (user | group | role) per entry
    permissions: [
        {
            $id: Now.ID['dashboard_operator_permission'],
            role: 'x_myapp_itsm.operator',
            canRead: true,
            canWrite: false,
        },
        {
            $id: Now.ID['dashboard_manager_permission'],
            role: 'x_myapp_itsm.manager',
            canRead: true,
            canWrite: true,
            canShare: true,
        },
    ],
})
```
