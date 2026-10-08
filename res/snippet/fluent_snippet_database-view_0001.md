# Join incidents to their caller with a database view in ServiceNow Fluent

```typescript
import { DatabaseView } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// One DatabaseView() call writes the sys_db_view row plus one sys_db_view_table per `tables` entry
// and one sys_db_view_table_field per `fields` entry. `name` is the identity (no top-level $id):
// already-normalized, and prefixed `u_` in global scope or `<scope>_` in an x_ scope.
DatabaseView({
    name: 'u_incident_with_caller',
    label: 'Incident With Caller',
    plural: 'Incidents With Caller',
    description: 'Incidents joined to the caller user record, including incidents with no caller',
    tables: [
        {
            $id: Now.ID['u_incident_with_caller_inc'],
            table: 'incident', // base table: lowest order
            variablePrefix: 'inc', // no underscore, <= 30 chars, unique within the view
            order: 100,
            fields: [
                { $id: Now.ID['u_incident_with_caller_inc_number'], field: 'number' },
                { $id: Now.ID['u_incident_with_caller_inc_short_description'], field: 'short_description' },
                // caller_id is referenced by the whereClause below, so it must be exposed here
                { $id: Now.ID['u_incident_with_caller_inc_caller_id'], field: 'caller_id' },
            ],
        },
        {
            $id: Now.ID['u_incident_with_caller_usr'],
            table: 'sys_user',
            variablePrefix: 'usr',
            order: 200,
            leftJoin: true, // LEFT OUTER JOIN: keep incidents that have no caller
            whereClause: 'inc_caller_id=usr_sys_id', // raw <prefix>_<field> predicate, NOT an encoded query
            fields: [
                { $id: Now.ID['u_incident_with_caller_usr_sys_id'], field: 'sys_id' },
                { $id: Now.ID['u_incident_with_caller_usr_name'], field: 'name' },
                { $id: Now.ID['u_incident_with_caller_usr_email'], field: 'email' },
            ],
        },
    ],
})
```
