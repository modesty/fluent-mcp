
# Now.ref

`Now.ref()` creates a reference to a record in another table. Use it when a field needs to point to a record that isn't defined in the current file — for example, referencing a role, a flow, or any record identified by its sys_id or coalesce keys.

## Syntax

```typescript
// By coalesce keys — identifies the record by unique field values
Now.ref(table: string, keys: { [key: string]: string }): any

// By sys_id or Now.ID key — identifies the record by GUID
Now.ref(table: string, guid: string, keys?: { [key: string]: string }): any
```

## Examples

### Reference by coalesce keys

When you know the unique field values that identify a record:

```typescript
import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['incident-read-acl'],
    type: 'record',
    operation: 'read',
    table: 'incident',
    roles: [
        Now.ref('sys_user_role', { name: 'admin' }),
        Now.ref('sys_user_role', { name: 'itil' }),
    ],
})
```

### Reference by sys_id

When you have the record's sys_id:

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['my-catalog-item'],
    table: 'sc_cat_item',
    data: {
        name: 'Request Laptop',
        flow: Now.ref('sys_hub_flow', 'a1b2c3d4e5f67890abcdef1234567890'),
    },
})
```

### Reference by Now.ID key

If the target record is also defined in your Fluent project, you can use its `Now.ID` key as the guid:

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['my-catalog-item'],
    table: 'sc_cat_item',
    data: {
        name: 'Request Laptop',
        flow: Now.ref('sys_hub_flow', 'test_flow_for_service_catalog'),
    },
})
```

### Reference with fallback coalesce keys

Provide both a GUID and coalesce keys — the keys act as a fallback identifier:

```typescript
Now.ref('sys_hub_flow', 'a1b2c3d4...', { name: 'My Flow' })
```

## When to use Now.ref vs direct references

| Scenario | Use |
|----------|-----|
| Record defined in same project | Return value of the API function (e.g., `const role = Role({...})`) |
| Record on the instance, known sys_id | `Now.ref('table', 'sys_id')` |
| Record on the instance, known unique fields | `Now.ref('table', { field: 'value' })` |
| Record in same project, different file | `Now.ID['key-name']` or `Now.ref('table', 'key-name')` |

