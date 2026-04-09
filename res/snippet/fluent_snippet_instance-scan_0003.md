# Instance Scan API example: ColumnTypeCheck and TableCheck for enforcing standards
```typescript
import { ColumnTypeCheck, TableCheck } from '@servicenow/sdk/core'

// Validates that all script columns follow best practices
ColumnTypeCheck({
	$id: Now.ID['scan_script_column_check'],
	name: 'Script Columns Must Follow Standards',
	shortDescription: 'Ensures script columns follow coding standards',
	description: 'Validates that script-type columns across tables follow coding best practices',
	active: true,
	category: 'manageability',
	priority: '3',
	columnType: 'script',
})

// Validates that custom tables have proper access controls defined
TableCheck({
	$id: Now.ID['scan_table_acl_required'],
	name: 'Custom Tables Must Have ACLs',
	shortDescription: 'Ensures custom tables have at least one ACL rule',
	description: 'Ensures custom tables have at least one ACL rule defined for security compliance',
	active: true,
	category: 'security',
	priority: '2',
	table: 'sys_db_object',
	conditions: 'nameSTARTSWITHu_^ORnameSTARTSWITHx_',
})
```
