# Business Rule API example: edit a Business Rule to set billable service using cmdb_ci name and assign current domain ID

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: '1a9b33736be23010bc5bffcd1e44af2e',
    action: ['insert'],
    filter_condition: get_encoded_query(
        'cmdb_ci is not empty and is_sample is false', 'em_alert'),
    script: `(function executeRule(current, previous /*null when async*/) {
    // Check if we have a CMDB CI
    if (current.cmdb_ci) {
        var ciGr = new GlideRecord('cmdb_ci');
        if (ciGr.get(current.cmdb_ci)) {
            // Set billable service using CMDB CI name
            current.billable_service = ciGr.name;
            
            // Assign current domain ID
            current.domain = gs.getCurrentDomainID();
            
            // Update the record
            current.update();
            
            // Log the update
            gs.log('Updated alert ' + current.number + ' with billable service: ' + ciGr.name + ' and domain: ' + gs.getCurrentDomainID(), 'BillingAlertsBusinessRule');
        }
    }
})(current, previous);`,
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
