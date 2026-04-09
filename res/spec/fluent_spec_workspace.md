# **Context:** Workspace API spec: Used to create a ServiceNow Workspace (`ux_workspace`) — a configurable, role-based work environment with automatic page generation, standardized navigation, and table integration. Also covers `UxListMenuConfig` (navigation configuration) and `Applicability` (role-based access control) which are used together with Workspace.

```typescript
import { Workspace, UxListMenuConfig, Applicability } from '@servicenow/sdk/core'

// ─── Applicability (`sys_ux_applicability`) ───
// Controls which roles can access a workspace or list. Used inside UxListMenuConfig lists.
Applicability({
    $id: Now.ID['my_applicability'], // string | Now.ID key, mandatory

    name: '',               // string, mandatory — display name
    description: '',        // string, optional
    active: true,           // boolean, optional — whether this applicability rule is active
    roles: [],              // Role[] | string[], optional — array of Role objects or sys_id strings
    roleNames: '',          // string, optional — comma-separated role names (alternative to roles array)
}): Applicability

// ─── UxListMenuConfig (`sys_ux_list_menu_config`) ───
// Defines the navigation structure (categories and lists) for a Workspace.
UxListMenuConfig({
    $id: Now.ID['my_list_menu_config'], // string | Now.ID key, mandatory

    name: '',               // string, mandatory — display name of this list configuration
    active: true,           // boolean, optional
    description: '',        // string, optional

    categories: [           // UxListCategory[], optional — navigation categories (sections)
        {
            $id: Now.ID['my_category'], // mandatory for each category
            title: '',      // string, mandatory — category heading label
            active: true,   // boolean, optional
            order: 10,      // number, optional — order among categories
            description: '', // string, optional

            lists: [        // UxList[], mandatory — lists within this category
                {
                    $id: Now.ID['my_list'], // mandatory for each list
                    title: '',  // string, mandatory — list tab/link label
                    table: '',  // string, mandatory — the ServiceNow table to display
                    active: true, // boolean, optional
                    order: 10,  // number, optional — order within the category
                    condition: '', // string, optional — encoded query to filter records
                    fixedQuery: '', // string, optional — fixed query appended to all filters
                    columns: '', // string, optional — comma-separated column names to display (e.g., 'number,priority,state,assigned_to')
                    view: '',   // string, optional — view name to apply
                    roles: '',  // string, optional — comma-separated role names for access
                    groupByColumn: '', // string, optional — column to group records by
                    wordWrap: false,   // boolean, optional — enable cell word wrap
                    enableInfiniteScroll: false, // boolean, optional — infinite scroll vs pagination
                    maxCharacters: 0,  // number, optional — max chars in cells before truncating
                    // Visibility applicabilities
                    applicabilities: [ // UxListApplicability[], optional — role-based list visibility
                        {
                            $id: Now.ID['list_applicability'],
                            applicability: applicabilityObject, // Applicability | string (sys_id)
                            active: true,
                            order: 100,
                        }
                    ],
                    // UI visibility toggles (all boolean, optional, default: false)
                    groups: [], // (string | Record<'sys_user_group'>)[], optional - user groups that can access this list
                    hideCellFilter: false,
                    hideCheckboxHover: false,
                    hideColumnGrouping: false,
                    hideColumnResizing: false,
                    hideDragAndDrop: false,
                    hideEmptyStateImage: false,
                    hideFirstPage: false,
                    hideHighlightContent: false,
                    hideHighlightedValues: false,
                    hideLastPage: false,
                    hideLastRefreshedText: false,
                    hideLinks: false,
                    hideMenuButton: false,
                    hideNextPage: false,
                    hideOptionToSaveAs: false,
                    hidePages: false,
                    hidePanelAdvanced: false,
                    hidePanelButton: false,
                    hidePanelConditionDelete: false,
                    hidePanelFooter: false,
                    hidePanelRestore: false,
                    hidePersonalization: false,
                    hidePreviousPage: false,
                    hideQuickEdit: false,
                    hideRange: false,
                    hideRecordCountBadge: false,
                    hideReferenceLinks: false,
                    hideRowSelector: false,
                    hideRowsPerPageSelector: false,
                    hideSelectAll: false,
                    hideSharingButton: false,
                    hideTitle: false,
                    highlightContentColor: '', // string, optional - highlight color
                    highlightContentPattern: '', // string, optional - highlight pattern
                    listAttributes: '', // string, optional - additional list attributes
                    liveUpdates: false, // boolean, optional - enable live updates
                    overrideWordWrapUserPref: false, // boolean, optional - override user word wrap preference
                    // Hide various UI elements (legacy toggles)
                    hideHeader: false,       // boolean, optional
                    hidePagination: false,   // boolean, optional
                    hideRefreshButton: false, // boolean, optional
                    hideRowCount: false,     // boolean, optional
                    hideListActions: false,  // boolean, optional
                    hideColumnFiltering: false, // boolean, optional
                    hideColumnSorting: false,   // boolean, optional
                    hideInlineEditing: false,   // boolean, optional
                }
            ]
        }
    ]
}): UxListMenuConfig

// ─── Workspace (`ux_workspace`) ───
Workspace({
    $id: Now.ID['my_workspace'], // string | Now.ID key, mandatory

    title: '',              // string, mandatory — display name of the workspace
    path: '',               // string, mandatory — URL path/route for the workspace (e.g., 'incident-management')
    active: true,           // boolean, optional — whether the workspace is active
    landingPath: '',        // string, optional — default landing path within the workspace
    order: 0,               // number, optional — order in unified navigation
    tables: [],             // string[] (TableName[]), optional — tables integrated with this workspace
    listConfig: listConfigObject, // UxListMenuConfig | string, optional — the navigation configuration
    defaultRecordOverrides: {}, // Record<string, Record<string, unknown>>, optional — overrides for records not tracked by the plugin
}): Workspace
```
