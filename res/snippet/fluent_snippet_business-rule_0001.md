# Business Rule API example: creating a new Business Rule in ServiceNow to abort if field doesn't belong to table
```typescript
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
	$id: Now.ID['abort_field_not_belong_business_rule'],
    name: "Abort if field doesn't belong to table",
    table: get_table_name('sn_access_analyzer_request'),
    order: 100,
    when: 'before',
    active: true,
    add_message: false,
    abort_action: false,
    script: get_glide_script(
            'sys_script', 
            'create script to abort action if field selected not belong to this table', 
            ''),
})
```
