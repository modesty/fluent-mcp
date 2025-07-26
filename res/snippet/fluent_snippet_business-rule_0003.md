# Business Rule API example: create a new Business Rule with a script that displays an info message to admin users when the RCA is updated 
```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['update_rca_business_rule'],
    action: ['update', 'insert'],
    filter_condition: 'rca!=NULL',
    script: `(function executeRule(current, previous /*null when async*/) {
    // Check if the user is an admin
    if (gs.hasRole('admin')) {
        // Display info message to admin users
        gs.addInfoMessage('RCA has been updated for record: ' + current.number);
        
        // Log the update
        gs.log('RCA updated for record ' + current.number + ' by ' + gs.getUserName(), 'RCA_Update_BR');
    }
})(current, previous);`,
    table: 'x_ap4_scm_rca_why',
    name: 'AP4 - Update RCA when updated',
    order: 100,
    when: 'after',
    active: true,
    add_message: false,
    abort_action: false,
})

```
