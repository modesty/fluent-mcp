# Function: Acl(config)

Creates an Access Control List (ACL) record that secures parts of an application (`sys_security_acl`).

## Usage

```ts
Acl({
    $id: Now.ID['incident_read'],
    type: 'record',
    table: 'incident',
    operation: 'read',
})
```
## Parameters

### config

`Acl<keyof Tables, 'pd_action' | 'record' | 'client_callable_flow_object' | 'client_callable_script_include' | 'processor' | 'ui_page' | 'ux_data_broker' | 'graphql' | 'rest_endpoint' | 'ux_page' | 'ux_route' | string>`

Configuration for the ACL record

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **operation** (required): `'read' | 'delete' | 'create' | 'execute' | 'write' | 'conditional_table_query_range' | 'data_fabric' | 'query_match' | 'query_range' | 'edit_task_relations' | 'edit_ci_relations' | 'save_as_template' | 'add_to_list' | 'report_on' | 'list_edit' | 'report_view' | 'personalize_choices'`
  The operation this ACL rule secures

- **type** (required): `'pd_action' | 'record' | 'client_callable_flow_object' | 'client_callable_script_include' | 'processor' | 'ui_page' | 'ux_data_broker' | 'graphql' | 'rest_endpoint' | 'ux_page' | 'ux_route' | string`
  Type of the resource being secured

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **active** (optional): `boolean`
  Whether the ACL rule is enabled or not

- **adminOverrides** (optional): `boolean`
  Whether users with admin role automatically pass the permissions check for this ACL rule

- **condition** (optional): `string`
  Filter query specifying fields and values that must be true for access

- **decisionType** (optional): `'allow' | 'deny'`
  Whether the ACL should allow or deny access

- **description** (optional): `string`
  Description of the object or permissions this ACL rule secures

- **localOrExisting** (optional): `'Local' | 'Existing'`
  Type of security attribute: 'Local' for condition-based or 'Existing' to reference an attribute

- **protectionPolicy** (optional): `'read' | 'protected'`
  Controls edit/view access for other developers

- **roles** (optional): `(string | Role)[]`
  Array of roles that have access to the object

- **script** (optional): `string | (current: any, dependencies: any[]) => boolean`
  Script that defines the permissions required to access the object

- **securityAttribute** (optional): `Record<'sys_security_attribute'> | 'user_is_authenticated' | 'has_admin_role'`
  Pre-defined conditions or security attributes to use for access control

**Variant Properties:**

*When `Type extends keyof typeof AclRecordTypes`:*

- **table** (required): `T`
  The table this ACL rule applies to

- **field** (optional): `keyof FullSchema<T> | SystemColumns | '*'`
  Optional field within the table to secure, or '*' for all fields

- **appliesTo** (optional): `string`
  Additional filter to specify which records this ACL applies to


*When `Type extends Exclude<keyof typeof AclNamedTypes, 'ux_route' | 'ux_page'>`:*

- **name** (required): `string`
  Name of the resource being secured


*When `Type extends keyof typeof AclDataBrokerType`:*

- **dataBroker** (optional): `Record<'sys_ux_data_broker'> | string`
  Reference to the UX data broker this ACL applies to

- **table** (optional): `T`
  The table this ACL rule applies to

- **field** (optional): `keyof FullSchema<T> | SystemColumns | '*'`
  Optional field within the table to secure, or '*' for all fields


*Otherwise:*

- **name** (optional): `string`
  Name of the resource being secured

- **table** (optional): `T`
  The table this ACL rule applies to

- **field** (optional): `keyof FullSchema<T> | SystemColumns | '*'`
  Optional field within the table to secure, or '*' for all fields

- **appliesTo** (optional): `string`
  Additional filter to specify which records this ACL applies to



## See

- https://docs.servicenow.com/csh?topicname=acl-api-now-ts.html&version=latest


## Examples

### Advanced ACL with Script

Create an ACL with a custom script for complex permission logic

```typescript
/**
 * @title Advanced ACL with Script
 * @description Create an ACL with a custom script for complex permission logic
 */

import { Acl, Role } from '@servicenow/sdk/core'

export const managerRole = Role({
    $id: Now.ID['manager_role'],
    name: 'manager',
})

export const incidentWithScript = Acl({
    $id: Now.ID['incident_with_script'],
    type: 'record',
    table: 'incident',
    operation: 'write',
    decisionType: 'allow',
    roles: [managerRole],
    script: `
        // Check if user is the assigned manager
        return current.assigned_to == gs.getUserID();
    `,
    description: 'Allow managers to write incidents they are assigned to',
    adminOverrides: false,
})

```

### Basic ACL Example

Create access control rules for incident table with role-based permissions

```typescript
/**
 * @title Basic ACL Example
 * @description Create access control rules for incident table with role-based permissions
 */

import { Acl, Role } from '@servicenow/sdk/core'

export const itilRole = Role({
    $id: Now.ID['itil_role'],
    name: 'itil',
})

export const adminRole = Role({
    $id: Now.ID['admin_role'],
    name: 'admin',
})

export const incidentDenyUnlessItil = Acl({
    $id: Now.ID['incident_deny_unless_itil'],
    type: 'record',
    table: 'incident',
    operation: 'read',
    decisionType: 'deny',
    roles: [itilRole],
    description: 'Deny access to incidents unless user has itil role',
    adminOverrides: true,
})

export const incidentAllowRead = Acl({
    $id: Now.ID['incident_allow_read'],
    type: 'record',
    table: 'incident',
    operation: 'read',
    decisionType: 'allow',
    roles: [itilRole],
    adminOverrides: true,
})

```

### REST Endpoint ACL

Create an ACL for protecting a REST API endpoint with role-based access

```typescript
/**
 * @title REST Endpoint ACL
 * @description Create an ACL for protecting a REST API endpoint with role-based access
 */
import { Acl, Role } from '@servicenow/sdk/core'

export const sampleAdmin = Role({
    name: 'x_acl_sample.admin',
})
Acl({
    $id: Now.ID['rest_acl'],
    name: 'sample_api',
    type: 'rest_endpoint',
    operation: 'execute',
    roles: [sampleAdmin],
    securityAttribute: 'user_is_authenticated',
})

```

