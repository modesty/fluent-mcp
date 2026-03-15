# Incident management dashboard: two-tab dashboard with KPI score, pie chart, and list widget, linked to the Incident Management workspace

```typescript
import { Dashboard } from '@servicenow/sdk/core'
import { incidentManagementWorkspace } from './incident-management-workspace.now'

export const incidentManagementDashboard = Dashboard({
    $id: Now.ID['incident_management_dashboard'],
    name: 'Incident Management Dashboard',
    active: true,

    tabs: [
        // ─── Overview tab ───
        {
            $id: Now.ID['dashboard_overview_tab'],
            name: 'Overview',
            active: true,
            widgets: [
                // Total open incidents — single KPI score
                {
                    $id: Now.ID['open_incidents_kpi'],
                    component: 'single-score',
                    componentProps: {
                        reportSysId: 'abc123reportSysId',  // sys_id of the report record
                        title: 'Open Incidents',
                    },
                    height: 6,
                    width: 6,
                    position: { x: 0, y: 0 },
                },
                // P1 incidents count
                {
                    $id: Now.ID['p1_incidents_kpi'],
                    component: 'single-score',
                    componentProps: {
                        reportSysId: 'def456reportSysId',
                        title: 'Critical (P1) Incidents',
                    },
                    height: 6,
                    width: 6,
                    position: { x: 6, y: 0 },
                },
                // Incidents by priority — pie chart
                {
                    $id: Now.ID['incidents_by_priority_chart'],
                    component: 'pie',
                    componentProps: {
                        reportSysId: 'ghi789reportSysId',
                        title: 'Incidents by Priority',
                    },
                    height: 8,
                    width: 12,
                    position: { x: 12, y: 0 },
                },
                // Open incidents over time — line chart
                {
                    $id: Now.ID['incidents_trend_chart'],
                    component: 'line',
                    componentProps: {
                        reportSysId: 'jkl012reportSysId',
                        title: 'Incident Trend (Last 30 Days)',
                    },
                    height: 8,
                    width: 24,
                    position: { x: 0, y: 6 },
                },
            ],
        },
        // ─── Active incidents list tab ───
        {
            $id: Now.ID['dashboard_active_tab'],
            name: 'Active Incidents',
            active: true,
            widgets: [
                {
                    $id: Now.ID['active_incidents_list_widget'],
                    component: 'list',
                    componentProps: {
                        reportSysId: 'mno345reportSysId',
                        title: 'Active Incidents',
                    },
                    height: 20,
                    width: 24,
                    position: { x: 0, y: 0 },
                },
            ],
        },
    ],

    // Link this dashboard to the Incident Management workspace
    visibilities: [
        {
            $id: Now.ID['dashboard_workspace_visibility'],
            experience: incidentManagementWorkspace,
        },
    ],

    // Set permissions: IT operators can read; IT managers can read and write
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
