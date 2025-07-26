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
    script: `(function executeRule(current, previous /*null when async*/) {
    // Get the field selected from the current record
    var selectedField = current.getValue('field');
    
    if (!selectedField) {
        return; // No field selected, nothing to check
    }
    
    // Get the table selected
    var selectedTable = current.getValue('table');
    
    if (!selectedTable) {
        gs.addErrorMessage('No table selected. Please select a table first.');
        current.setAbortAction(true);
        return;
    }
    
    // Check if the field belongs to the table
    var tableUtils = new TableUtils(selectedTable);
    var fieldsInTable = tableUtils.getFields();
    
    var fieldExists = false;
    for (var i = 0; i < fieldsInTable.size(); i++) {
        if (fieldsInTable.get(i) == selectedField) {
            fieldExists = true;
            break;
        }
    }
    
    if (!fieldExists) {
        gs.addErrorMessage('The field "' + selectedField + '" does not belong to table "' + selectedTable + '". Please select a valid field.');
        current.setAbortAction(true);
    }
})(current, previous);`,
})
```
