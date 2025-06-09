# Business Rule API example: edit a Business Rule to set billable service using cmdb_ci name and assign current domain ID

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: '1a9b33736be23010bc5bffcd1e44af2e',
    action: ['insert'],
    filter_condition: get_encoded_query(
        'cmdb_ci is not empty and is_sample is false', 'em_alert'),
    script:  get_glide_script(
            'sys_script', 
            'set billable service using cmdb_ci name and assign current domain ID', 
            '(function executeRule(current, previous /*null when async*/ ) { gs.include("CMDBItem"); var chg = new CMDBItem(null);chg.changeCategory(previous, current);  })(current, previous);'),
    table: get_table_name('em_alert'),
    name: 'Billing Alerts',
    order: 100,
    when: 'after',
    active: true,
    add_message: false,
    abort_action: false,
    condition:
        'gs.nil(current.getValue("sn_air_core_integration_usage")) || gs.nil(current.sn_air_core_integration_usage.integration) || !current.sn_air_core_integration_usage.integration.exempt_from_billing',
})
```
