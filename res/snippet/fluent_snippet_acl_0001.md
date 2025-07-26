# ACL API example: create two record type ACLs to restrict read and delete access on the task table using roles, condition, and script
```typescript
import { Acl, Role } from '@servicenow/sdk/core'

const managerRole = Role({ 
   $id: Now.ID['manager_role'], // unique identifier
   name: 'sn_xxxx.manager' // role name
})

// create a record ACL that requires manager role to read the description field of a task
Acl({
  $id: Now.ID['readDescriptionAcl'],
  operation: 'read',
  type: 'record',
  table: 'task',
  field: 'description',
  roles: [managerRole],
});

// create a record ACL that requires admin or manager role to delete a task with priority 2 and active status
Acl({
  $id: Now.ID['deleteAcl'],
  operation: 'delete',
  type: 'record',
  table: 'task',
  roles: [get_sys_id('sys_user_role', 'name=admin'), managerRole],
  condition: get_encoded_query(
    'when a task’s priority is 2 and active is true',
     'task'),
  script: `function executeRule() {
    // Check if the record is new
    if (current.isNewRecord()) {
        return true; // Allow deletion for new records
    }
    return false; // Don't allow deletion for existing records
}`
});
```
