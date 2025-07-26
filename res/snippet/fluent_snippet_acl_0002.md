# ACL API example: create a record type ACL that allows write access to the sn_table_bldr_wzd_attachment_helper table, if the custom script logic returns true.
```typescript
import { Acl } from '@servicenow/sdk/core'

export default Acl({
    $id: Now.ID['example_record_acl'],
    script: `function executeRule() {
    // Check if the record is new
    if (current.isNewRecord()) {
        return true; // Allow write access for new records
    }
    
    // Check if the current user is the creator of the record
    var currentUser = gs.getUserID();
    if (current.sys_created_by == currentUser) {
        return true; // Allow write access if the current user created the record
    }
    
    return false; // Deny write access in all other cases
}`,
    active: true,
    admin_overrides: false,
    description: 'Allow write for records in sn_table_bldr_wzd_attachment_helper, if the ACL script returns true.',
    type: 'record',
    table: 'sn_table_bldr_wzd_attachment_helper',
    operation: 'write',
})
```
