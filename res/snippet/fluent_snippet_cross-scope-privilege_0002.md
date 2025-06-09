# create a cross-scope privilege to allow access to basic GlideRecord methods
```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Create cross-scope privileges to allow scripts in this application to call the `setValue`, `update`, and `deleteRecord` methods of the `GlideRecord` API.

CrossScopePrivilege({
    $id: Now.ID['setValue'],
    target_name: 'GlideRecord.setValue',
    target_scope: 'global',
    status: 'allowed',
    target_type: 'scriptable',
    operation: 'execute',
})

CrossScopePrivilege({
    $id: Now.ID['update'],
    target_name: 'GlideRecord.update',
    target_scope: 'global',
    status: 'allowed',
    target_type: 'scriptable',
    operation: 'execute',
})

CrossScopePrivilege({
    $id: Now.ID['delete'],
    target_name: 'GlideRecord.deleteRecord',
    target_scope: 'global',
    status: 'allowed',
    target_type: 'scriptable',
    operation: 'execute',
})
```
