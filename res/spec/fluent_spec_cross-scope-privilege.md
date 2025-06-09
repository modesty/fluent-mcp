#**Context:** Cross-Scope Privilege API spec: Cross-Scope Privileges are used to manage an application's runtime access to scripts and tables in other scopes.
```typescript
// spec to create CrossScopePrivilege in Fluent
CrossScopePrivilege({
    $id: '', // string | guid, mandatory
    target_name: '', // string, name of the table, script include, or script object being requested
    target_scope: '', // string, application whose resources are being requested
    target_type: 'sys_script_include', // string, type of request: `sys_script_include`|`scriptable`|`sys_db_object`
    operation: 'read', // string, operation the script performs on the target: `create`|`read`|`write`|`delete`|`execute`
    status: 'allowed', // string, authorization for this record: `allowed`|`denied`|`requested`
})
```
