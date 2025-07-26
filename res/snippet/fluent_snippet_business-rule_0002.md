# Business Rule API example: create a Business Rule in ServiceNow that runs when a task's state changes to In Progress, and the parent case has category = invoice_automation and sub_category = invoice_exceptions. Create a script to update the parent case's state to In Progress and show an info message if the user has the admin role.

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id:  Now.ID['set_state_business_rule'],
    action: ['update'],
    filter_condition: get_encoded_query(
        'when a task's state changes to In Progress, and the parent case has category = invoice_automation and sub_category = invoice_exceptions.', 
        'sn_ap_cm_ap_task'),
    script: `(function executeRule(current, previous /*null when async*/) {
    // Check if there's a parent case
    if (current.parent) {
        // Get the parent case record
        var parentCase = new GlideRecord('sn_ap_cm_case');
        if (parentCase.get(current.parent)) {
            // Update the parent case's state to In Progress
            parentCase.state = 'in_progress';
            parentCase.update();
            
            // Log the update
            gs.log('Updated parent case ' + parentCase.number + ' state to In Progress', 'TaskStateBusinessRule');
            
            // Show info message if user has admin role
            if (gs.hasRole('admin')) {
                gs.addInfoMessage('Parent case ' + parentCase.number + ' has been updated to In Progress state');
            }
        }
    }
})(current, previous);`,
    table: get_table_name('sn_ap_cm_ap_task'),
    name: 'Set case state when task is in progress',
    order: 100,
    when: 'async',
    active: true,
    add_message: false,
    abort_action: false,
})
```
