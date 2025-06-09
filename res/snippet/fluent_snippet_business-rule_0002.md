# Business Rule API example: create a Business Rule in ServiceNow that runs when a task’s state changes to In Progress, and the parent case has category = invoice_automation and sub_category = invoice_exceptions. Create a script to update the parent case’s state to In Progress and show an info message if the user has the admin role.

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id:  Now.ID['set_state_business_rule'],
    action: ['update'],
    filter_condition: get_encoded_query(
        'when a task’s state changes to In Progress, and the parent case has category = invoice_automation and sub_category = invoice_exceptions.', 
        'sn_ap_cm_ap_task'),
    script: get_glide_script(
            'sys_script', 
            'Create a script to update the parent case’s state to In Progress and show an info message if the user has the admin role.', 
            ''),
    table: get_table_name('sn_ap_cm_ap_task'),
    name: 'Set case state when task is in progress',
    order: 100,
    when: 'async',
    active: true,
    add_message: false,
    abort_action: false,
})

```
