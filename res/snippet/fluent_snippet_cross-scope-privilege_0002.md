# create a cross-scope privilege to allow access to basic GlideRecord methods
```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Create cross-scope privileges to allow scripts in this application to call the `setValue`, `update`, and `deleteRecord` methods of the `GlideRecord` API.

CrossScopePrivilege({
    $id: Now.ID['setValue'],
    targetName: 'GlideRecord.setValue',
    targetScope: 'global',
    status: 'allowed',
    targetType: 'scriptable',
    operation: 'execute',
})

CrossScopePrivilege({
    $id: Now.ID['update'],
    targetName: 'GlideRecord.update',
    targetScope: 'global',
    status: 'allowed',
    targetType: 'scriptable',
    operation: 'execute',
})

CrossScopePrivilege({
    $id: Now.ID['delete'],
    targetName: 'GlideRecord.deleteRecord',
    targetScope: 'global',
    status: 'allowed',
    targetType: 'scriptable',
    operation: 'execute',
})
```
