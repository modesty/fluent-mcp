# **Context:** Dashboard API spec: Used to create a ServiceNow Platform Analytics Dashboard (`par_dashboard`) — a configurable analytics and reporting page organized into tabs with positioned widgets. Every widget binds its data inline through `componentProps` (no separate report record). Dashboards can be linked to Workspaces via visibility rules. Layout, per-widget `componentProps` shapes, and filters below are documented in SDK v4.13.x guides (`dashboard-guide`, `dashboard-filters-guide`); the `Dashboard` types are unchanged.

```typescript
import { Dashboard } from '@servicenow/sdk/core'

// Creates a new Dashboard (`par_dashboard`)
Dashboard({
    $id: Now.ID['my_dashboard'], // string | Now.ID key, mandatory — unique identifier

    // ─── Core fields ───
    name: '',               // string, mandatory — display name of the dashboard
    active: true,           // boolean, optional — whether the dashboard is active, default: true
    description: '',        // string, optional — descriptive text shown for the dashboard, default: '' (omit to leave empty)
    certified: false,       // boolean, optional — marks the dashboard as verified and recommended across the company, default: false

    // ─── Top layout (header, above the tab bar) ───
    // Widgets here render above all tabs. A filter placed here drives following widgets on EVERY tab
    // (the conventional home for a dashboard's primary filters) — see Filters below.
    topLayout: {            // DashboardTopLayout, optional
        widgets: [],        // DashboardWidget[], mandatory when topLayout is set
    },

    // ─── Tabs ───
    tabs: [                 // DashboardTab[], optional — tabbed sections of the dashboard
        {
            $id: Now.ID['tab_overview'], // mandatory for each tab
            name: '',       // string, mandatory — tab label
            active: true,   // boolean, optional — whether the tab is visible, default: true
            widgets: [      // DashboardWidget[], mandatory — widgets in this tab
                {
                    $id: Now.ID['widget_by_priority'], // mandatory for each widget
                    component: 'vertical-bar', // string, mandatory — component name (kebab-case, case-insensitive) or component sys_id
                    // Record<string, unknown>, mandatory — ALL data binding is inline here (untyped, not compile-time checked).
                    // A partial object is fine: the build merges the SDK's widget defaults under it.
                    componentProps: {
                        headerTitle: 'Active incidents by priority',
                        dataSources: [
                            { sourceType: 'table', tableOrViewName: 'incident', filterQuery: 'active=true', id: 'ds_1' },
                        ],
                        groupBy: [
                            { groupBy: [{ dataSource: 'ds_1', groupByField: 'priority', isChoice: true }], maxNumberOfGroups: 'ALL', sortBy: 'value', sortByOrder: 'desc' },
                        ],
                        metrics: [{ dataSource: 'ds_1', aggregateFunction: 'COUNT', axisId: 'primary' }],
                    },
                    height: 14,     // number, mandatory — rows; a separate, unscaled axis from width (not a square grid)
                    width: 24,      // number, mandatory — columns on a 48-column grid (full = 48, half = 24, third = 16, quarter = 12)
                    position: {
                        x: 0,       // number, mandatory — 0-based column on the 48-column grid
                        y: 0,       // number, mandatory — 0-based row
                    },
                },
            ],
        }
    ],

    // ─── Grid (documented in SDK v4.13.x guides) ───
    // The widget grid is 48 columns wide, not 12 or 24. Author width/position.x in 48-column units from the start:
    // some environments auto-scale width/x by 4x (12 -> 48) on first install, so do not rely on that scaling.
    // Overlapping positions overlap on the rendered dashboard.

    // ─── Component names (resolved to sys_ids by the build plugin) ───
    // Category comparison: 'pie' | 'donut' | 'semi-donut' | 'vertical-bar' | 'horizontal-bar' | 'pareto'
    // Time trend:          'column' | 'line' | 'spline' | 'area' | 'scatter' | 'step'
    // Two dimensions:      'heatmap' | 'pivot-table' | 'bubble' | 'boxplot'
    // Single value:        'single-score' | 'dial' | 'gauge'
    // Other data:          'geomap' | 'indicator-scorecard' | 'list' | 'calendar-report'
    // Static:              'heading' | 'rich-text' | 'image'
    // Legacy:              'compatibility-mode-widget'
    // string               — any other component, by its 32-character sys_id
    //
    // Documented in SDK v4.13.x guides but NOT verified: 'filter', 'filter-group', 'list-simple'.
    // Not verified: `filter`, `filter-group` and `list-simple` are absent from the SDK build plugin's component name-to-sys_id map, so the build writes them through as literal strings — verify on an instance, or pass the component sys_id instead.

    // ─── componentProps by widget family (documented in SDK v4.13.x guides) ───
    // Shared header & border keys (every chart/score/list widget; not heading/rich-text/filter):
    //   showBorder, showHeader, showHeaderSeparator, headerTitle, headerTitleAlignment ('start'|'center'|'end'),
    //   description, wrapTitle, lineClamp, showRefresh, showExportOptions
    // Title key differs per widget: charts/scores/'list' -> headerTitle; 'list-simple' -> listTitle;
    //   'calendar-report' -> componentTitle; 'heading' -> label. There is no generic title key and no report sys_id key.
    //
    // Data wiring (pie/donut/semi-donut/vertical-bar/horizontal-bar/pareto/column/line/spline/area/heatmap/
    // pivot-table/single-score/dial/gauge/geomap): three arrays linked by dataSources[].id
    //   dataSources: [{ sourceType: 'table' | 'indicator' | 'pa', tableOrViewName, filterQuery, id }]  // capital S
    //   groupBy:     [{ groupBy: [{ dataSource, groupByField /* plain field name for table sources */, isChoice }],
    //                   maxNumberOfGroups, sortBy, sortByOrder }]                                         // omit for single-value widgets
    //   metrics:     [{ dataSource, aggregateFunction /* e.g. 'COUNT' */, axisId /* e.g. 'primary' */, id? }]
    //
    // Category charts: ONE groupBy entry + metrics ('pareto' adds its cumulative line automatically).
    // Time-trend charts: metrics[].id + trendBy instead of a category groupBy
    //   trendBy: { trendByFrequency: 'date', trendByFields: [{ field: 'sys_created_on', metric: 'metric_1' /* a metrics[].id */ }] }
    //   ('scatter'/'step' render "A 'Trend By' must be selected" without trendBy); optional period ('M'), autoAggregatePeriods, showForecast.
    // 'heatmap': both dimensions inside ONE groupBy entry's groupBy array.
    // 'pivot-table': needs all of — newReporting: true + dataCategory: 'group' (the build default is newReporting: false);
    //   TWO separate groupBy entries with categoryIndex 0 (rows) and 1 (columns); metrics[].id + numberFormat: { customFormat: false };
    //   showFirstGroupAggregate / showSecondGroupAggregate / showTotalAggregate: true. Otherwise value cells render blank.
    // 'bubble' / 'boxplot': TWO separate groupBy entries (no categoryIndex). For 'boxplot', groupBy[0] is the box category
    //   and groupBy[1] the field whose per-category metric values form each box.
    // 'single-score': metrics only, no groupBy; set showZero: true (build default false) or a zero COUNT renders "No score".
    // 'dial' / 'gauge': metrics only, plus minValue / maxValue (the arc is a fixed half-circle).
    // 'geomap': groupBy a location field (isChoice: false); mapSysId = a sys_report_map sys_id
    //   (default World '93b8a3a2d7101200bd4a4ebfae61033a'); match the map to the grouped values' granularity.
    // 'indicator-scorecard': Platform Analytics indicators, not dataSources wiring —
    //   scorecardType 'list' | 'pivot'; sourceType '1' (indicators: [{ id /* pa_indicators sys_id */, label }]) |
    //   '0' (query on the indicator table) | '2' (indicatorGroup sys_id); breakdowns: [{ breakdownId /* pa_breakdowns sys_id */, ... }];
    //   metrics: { fields: ['lastScore', 'trend'], multiScore: {...} }; aggregateId 'default' or a PA aggregate sys_id.
    // 'list': aggregation-capable, wired like charts (dataSources, metrics, groupByField) plus table and columns;
    //   title headerTitle; show* toggles (showLinks, showViewAll, showColumnSorting, ...); wrapCellContent; limit.
    // 'list-simple' (not verified, see above): flat filtered table — table, query, fixedQuery, columns, limit, maxColumns;
    //   title listTitle (headerTitle is ignored); inverted hide* toggles (hideLinks, hideViewAll, ...); wordWrap. No dataSources/metrics.
    // Both lists: columns is ONE comma-separated string ('number,short_description,state'), not an array;
    //   no sort prop — sort in the query with ^ORDERBYDESC<field> (or ^ORDERBY<field>), never a bare ^ORDERBY.
    // 'calendar-report': componentTitle, table, startDateField (internal name, e.g. 'opened_at'), eventDisplayFields
    //   (comma-separated string); endDateField plots spans and is required unless hideEndDate: true. No dataSources/metrics.
    // 'heading': { label, variant /* e.g. 'header-secondary' */, level /* string, e.g. '1' */, align, hasNoMargin, wontWrap }.
    // 'rich-text': { html }. 'image': { src: '/<db_image name, with extension>' } (same-origin image).
    // Unresolvable sys_ids (mapSysId, indicator/breakdown ids) deploy without error and render an empty widget.

    // ─── Filters (documented in SDK v4.13.x guides; component names not verified, see above) ───
    // 'filter' componentProps:
    //   filterName, filterComponentType: 'multiselect' | 'singleselect' | 'date', isDashboard: true,
    //   datasource: { type, payload }   // SINGULAR, lowercase — where the selectable options come from (not dataSources)
    //   targets: [{ type, payload }]    // where the selection is applied; one filter may drive several tables
    //   payload shapes (datasource and targets alike):
    //     choice field:    { table: 'incident', field: 'priority', fieldType: 'choice' }
    //     reference field: datasource { table: 'sys_user' } (the referenced table); target { field: 'assigned_to', table: 'incident', primaryKey: 'sys_id' }
    //     date field:      filterComponentType: 'date', dateFilterView, defaultSelectedDateRange: { range, label }, datasource: {},
    //                      target { field: 'sys_created_on', table: 'incident', primaryKey: 'sys_id' }
    //     indicator:       datasource { type: 'indicator', payload: { targetTable, factsTable, field, isChoiceType, breakdown } }
    //   other keys: filterId, defaultSelectedItems, sort, maxElements (default 500), cascadeScope, enableClearFilter, primaryActionLabel
    // 'filter-group' componentProps: child filters go in groupConfiguration.filters[] (each a full filter config);
    //   top-level targets alone render "No filters configured". groupConfiguration also takes label, layout, showApply,
    //   showClear, showReset, cascadeScope, ...
    // Scope: a filter in topLayout.widgets drives following widgets on every tab; a filter in a tab's widgets drives only that tab.
    // The link is the target's table + field: a target { table: 'incident', field: 'priority' } narrows every incident-sourced widget in scope.
    // Following is a build default: the plugin merges followFilters: true and filterConfigurations: '@state.parFilters'
    //   into every widget's componentProps, so do not author them.

    // ─── Visibilities ───
    visibilities: [         // DashboardVisibility[], optional — links dashboard to experiences (e.g., Workspaces)
        {
            $id: Now.ID['visibility_id'], // mandatory
            experience: workspaceObject, // string | Workspace, mandatory — exported Workspace object or sys_ux_page_registry sys_id
        }
    ],

    // ─── Permissions ───
    permissions: [          // DashboardPermission[], optional — user/group/role-level access control
        {
            $id: Now.ID['permission_id'], // mandatory
            // Provide exactly one of: user, group, or role (mutually exclusive)
            role: '',       // string | Record<'sys_user_role'> — or user: string | Record<'sys_user'>, or group: string | Record<'sys_user_group'>
            // Access flags:
            canRead: true,  // boolean, optional — read access, default: true
            canWrite: false, // boolean, optional — edit access, default: false
            canShare: false, // boolean, optional — share access, default: false
            owner: false,   // boolean, optional — owner flag, default: false
        }
    ],
}): Dashboard // returns a Dashboard object
```
