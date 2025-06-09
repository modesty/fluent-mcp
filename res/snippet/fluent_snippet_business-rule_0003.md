# Business Rule API example: create a new Business Rule with a script that displays an info message to admin users when the RCA is updated 
```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['update_rca_business_rule'],
    action: ['update', 'insert'],
    filter_condition: get_encoded_query(
        'when rca is not empty', 
        'x_ap4_scm_rca_why'),
    script: get_glide_script(
            'sys_script', 
            'Create a script to display an info message to admin users when the RCA is updated', 
            ''),
    table: get_table_name('x_ap4_scm_rca_why'),
    name: 'AP4 - Update RCA when updated',
    order: 100,
    when: 'after',
    active: true,
    add_message: false,
    abort_action: false,
})

```
