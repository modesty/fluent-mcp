# ACL API example: create a record type ACL that allows write access to the sn_table_bldr_wzd_attachment_helper table, if the custom script logic returns true.
```typescript
import { Acl } from '@servicenow/sdk/core'

export default Acl({
    $id: Now.ID['example_record_acl'],
    script: get_glide_script(
        'sys_security_acl', 
        'create a record type ACL that allows write for sn_table_bldr_wzd_attachment_helper table if record is new and user is the one who created the record', 
        ''),
    active: true,
    admin_overrides: false,
    description: 'Allow write for records in sn_table_bldr_wzd_attachment_helper, if the ACL script returns true.',
    type: 'record',
    table: 'sn_table_bldr_wzd_attachment_helper',
    operation: 'write',
})
```
