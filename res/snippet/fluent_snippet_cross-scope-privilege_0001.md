# create a cross-scope privilege to allow access to a specific table in another scope
```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Create a cross-scope privilege to allow this application to read records from the `sys_user` table in `x_snc_example` scope.
CrossScopePrivilege({
    $id: Now.ID['cross_1'],
    targetName: 'sys_user',
    targetScope: 'x_snc_example',
    status: 'allowed',
    targetType: 'sys_db_object',
    operation: 'read',
})
```
