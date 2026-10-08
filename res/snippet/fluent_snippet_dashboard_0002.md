# Dashboard filters (component names NOT verified): a header 'filter' in topLayout drives widgets on every tab, and a tab-scoped 'filter-group' with priority + assigned-to child filters drives only its own tab

```typescript
import { Dashboard } from '@servicenow/sdk/core'

// Not verified: `filter`, `filter-group` and `list-simple` are absent from the SDK build plugin's component name-to-sys_id map, so the build writes them through as literal strings — verify on an instance, or pass the component sys_id instead.
//
// Following is a build default: the plugin merges followFilters: true and filterConfigurations: '@state.parFilters'
// into every widget's componentProps, so the data widgets below do not author them. A filter narrows a widget
// when one of its targets names the table + field the widget draws from (here: incident.priority / incident.assigned_to).
export const incidentFiltersDashboard = Dashboard({
    $id: Now.ID['incident_filters_dashboard'],
    name: 'Incident Filters Dashboard',

    // Header filter (above the tab bar) — drives following widgets on EVERY tab
    topLayout: {
        widgets: [
            {
                $id: Now.ID['header_priority_filter'],
                component: 'filter',
                componentProps: {
                    filterName: 'Priority',
                    filterComponentType: 'multiselect',
                    isDashboard: true,
                    // datasource (singular): where the options come from — a choice field
                    datasource: { type: 'table', payload: { table: 'incident', field: 'priority', fieldType: 'choice' } },
                    // targets: where the selection is applied
                    targets: [{ type: 'table', payload: { table: 'incident', field: 'priority', fieldType: 'choice' } }],
                },
                height: 6,
                width: 24,
                position: { x: 0, y: 0 },
            },
        ],
    },

    tabs: [
        {
            $id: Now.ID['filters_overview_tab'],
            name: 'Overview',
            widgets: [
                // Tab-scoped filter group — child filters live in groupConfiguration.filters[], not top-level targets
                {
                    $id: Now.ID['overview_filter_group'],
                    component: 'filter-group',
                    componentProps: {
                        filterName: 'Incident filters',
                        isDashboard: true,
                        groupConfiguration: {
                            filterId: 'group-incident-filters',
                            showLabel: true,
                            label: 'Incident filters',
                            layout: 'horizontal',
                            showApply: true,
                            showClear: true,
                            showReset: false,
                            filters: [
                                {
                                    filterId: 'fg-priority',
                                    filterName: 'Priority',
                                    filterComponentType: 'multiselect',
                                    datasource: { type: 'table', payload: { table: 'incident', field: 'priority', fieldType: 'choice' } },
                                    targets: [{ type: 'table', payload: { table: 'incident', field: 'priority', fieldType: 'choice' } }],
                                },
                                {
                                    // Reference field: datasource is the REFERENCED table; the target is the reference field on the fact table
                                    filterId: 'fg-assigned-to',
                                    filterName: 'Assigned to',
                                    filterComponentType: 'multiselect',
                                    datasource: { type: 'table', payload: { table: 'sys_user' } },
                                    targets: [{ type: 'table', payload: { field: 'assigned_to', table: 'incident', primaryKey: 'sys_id' } }],
                                },
                            ],
                        },
                    },
                    height: 6,
                    width: 48,
                    position: { x: 0, y: 0 },
                },
                // Follows both the header filter and the tab's filter group (incident-sourced)
                {
                    $id: Now.ID['filtered_open_incidents_score'],
                    component: 'single-score',
                    componentProps: {
                        headerTitle: 'Open incidents',
                        dataSources: [{ sourceType: 'table', tableOrViewName: 'incident', filterQuery: 'active=true', id: 'ds_1' }],
                        metrics: [{ dataSource: 'ds_1', aggregateFunction: 'COUNT', axisId: 'primary' }],
                        showZero: true,
                    },
                    height: 7,
                    width: 12,
                    position: { x: 0, y: 6 },
                },
                {
                    $id: Now.ID['filtered_by_category_chart'],
                    component: 'vertical-bar',
                    componentProps: {
                        headerTitle: 'Open incidents by category',
                        dataSources: [{ sourceType: 'table', tableOrViewName: 'incident', filterQuery: 'active=true', id: 'ds_1' }],
                        groupBy: [
                            {
                                groupBy: [{ dataSource: 'ds_1', groupByField: 'category', isChoice: true }],
                                maxNumberOfGroups: 'ALL',
                                sortBy: 'value',
                                sortByOrder: 'desc',
                            },
                        ],
                        metrics: [{ dataSource: 'ds_1', aggregateFunction: 'COUNT', axisId: 'primary' }],
                    },
                    height: 14,
                    width: 24,
                    position: { x: 12, y: 6 },
                },
            ],
        },
    ],
    visibilities: [],
    permissions: [],
})
```
