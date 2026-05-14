# Cross-Scope Privileges

Guide for creating ServiceNow Cross-Scope Privileges using the Fluent API. Cross-scope privileges declare that your application needs to access resources (tables, script includes, scriptable objects) owned by a different application scope.

## When to Use

- Your application needs to read, write, or execute resources from another application scope
- Debugging "operation against ... not allowed" errors at runtime
- Pre-authorizing cross-scope access so it works without manual admin approval
- Your scoped app needs to call script includes or access tables owned by another scope

## Instructions

1. **Identify the target resource:** Determine the exact table, script include, or scriptable object your app needs to access, and which scope owns it.
2. **Choose the right operation:** Tables support `read`, `write`, `create`, `delete`. Script includes and scriptable objects only support `execute`.
3. **Set status to `allowed`:** For pre-authorized access in your application package. Use `requested` if you want admin approval at install time.
4. **One privilege per operation per target:** Create separate `CrossScopePrivilege` records for each operation. If you need read and write on a table, create two records.
5. **Use the correct `targetType`:** `sys_db_object` for tables, `sys_script_include` for script includes, `scriptable` for scriptable objects.

## Key Concepts

### When Cross-Scope Privileges Are Needed

- Your business rule queries a table owned by another scoped app
- Your script include calls a script include from another scope
- Your scheduled script updates records in another scope's table

Without these declarations, the platform blocks cross-scope operations at runtime.

### Status Values

- **`allowed`** -- Access is pre-authorized. The platform permits the operation without admin intervention.
- **`requested`** -- Access requires admin approval after installation. Use when you cannot guarantee the target scope will be present.
- **`denied`** -- Explicitly blocks the operation. Rarely used in application code.

### Relationship to Table Access Settings

Tables also have their own cross-scope controls via `accessible_from` and `caller_access` properties on the Table API. Cross-scope privileges work alongside these settings -- both must permit the operation for it to succeed.

## Avoidance

- **Never use `execute` for table operations** -- tables use `read`, `write`, `create`, `delete`; only script includes and scriptable objects use `execute`
- **Never assume cross-scope access works by default** -- scoped apps are isolated; any cross-scope operation needs an explicit privilege
- **Avoid over-requesting** -- only request the specific operations you actually need on each target

## API Reference

For the full property reference, see the `crossscopeprivilege-api` topic.

## Examples

### Execute a Scriptable Object in Another Scope

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

CrossScopePrivilege({
    $id: Now.ID['cross_1'],
    status: 'allowed',
    operation: 'execute',
    targetName: 'Script type',
    targetScope: 'x_snc_example',
    targetType: 'scriptable',
})
```

### Read and Write a Table in Another Scope

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Read access
CrossScopePrivilege({
    $id: Now.ID['cross_read_incidents'],
    status: 'allowed',
    operation: 'read',
    targetName: 'incident',
    targetScope: 'global',
    targetType: 'sys_db_object',
})

// Write access (separate record)
CrossScopePrivilege({
    $id: Now.ID['cross_write_incidents'],
    status: 'allowed',
    operation: 'write',
    targetName: 'incident',
    targetScope: 'global',
    targetType: 'sys_db_object',
})
```

### Execute a Script Include from Another Scope

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

CrossScopePrivilege({
    $id: Now.ID['cross_exec_utils'],
    status: 'requested',
    operation: 'execute',
    targetName: 'SharedUtils',
    targetScope: 'x_partner_shared',
    targetType: 'sys_script_include',
})
```

