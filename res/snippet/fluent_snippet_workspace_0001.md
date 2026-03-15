# Incident management workspace: creates a workspace for IT operators with role-based navigation showing Open, In Progress, and Resolved incidents

```typescript
import { Workspace, UxListMenuConfig, Applicability, Role } from '@servicenow/sdk/core'

// Define the role required to access this workspace
export const itOperatorRole = Role({
    $id: Now.ID['it_operator_role'],
    name: 'x_myapp_itsm.operator',
    containsRoles: ['itil'],
})

// Define applicability — controls which users see the navigation lists
export const itOperatorApplicability = Applicability({
    $id: Now.ID['it_operator_applicability'],
    name: 'IT Operators',
    description: 'Applies to users with the IT operator role',
    active: true,
    roles: [itOperatorRole],
})

// Define the workspace navigation configuration
export const incidentListMenuConfig = UxListMenuConfig({
    $id: Now.ID['incident_list_menu_config'],
    name: 'Incident Management Navigation',
    description: 'Navigation structure for the Incident Management workspace',
    active: true,

    categories: [
        {
            $id: Now.ID['incidents_category'],
            title: 'Incidents',
            order: 10,
            lists: [
                {
                    $id: Now.ID['open_incidents_list'],
                    title: 'Open',
                    table: 'incident',
                    order: 10,
                    condition: 'active=true^state=1^EQ',
                    columns: 'number,short_description,priority,assigned_to,opened_at',
                    applicabilities: [
                        {
                            $id: Now.ID['open_incidents_applicability'],
                            applicability: itOperatorApplicability,
                            order: 100,
                        }
                    ],
                },
                {
                    $id: Now.ID['in_progress_incidents_list'],
                    title: 'In Progress',
                    table: 'incident',
                    order: 20,
                    condition: 'active=true^state=2^EQ',
                    columns: 'number,short_description,priority,assigned_to,sys_updated_on',
                    applicabilities: [
                        {
                            $id: Now.ID['in_progress_applicability'],
                            applicability: itOperatorApplicability,
                            order: 100,
                        }
                    ],
                },
                {
                    $id: Now.ID['resolved_incidents_list'],
                    title: 'Resolved (Last 7 Days)',
                    table: 'incident',
                    order: 30,
                    condition: 'state=6^resolved_atONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()^EQ',
                    columns: 'number,short_description,resolved_by,resolved_at',
                    applicabilities: [
                        {
                            $id: Now.ID['resolved_applicability'],
                            applicability: itOperatorApplicability,
                            order: 100,
                        }
                    ],
                },
            ],
        },
    ],
})

// Create the workspace
export const incidentManagementWorkspace = Workspace({
    $id: Now.ID['incident_management_workspace'],
    title: 'Incident Management',
    path: 'incident-management',
    active: true,
    landingPath: 'list/incident',
    order: 100,
    tables: ['incident', 'sys_user'],
    listConfig: incidentListMenuConfig,
})
```
