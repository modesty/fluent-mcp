# Instance Scan API example: ColumnTypeCheck and TableCheck for enforcing standards
```typescript
import { ColumnTypeCheck, TableCheck } from '@servicenow/sdk/core'

// Validates that all string columns have a max length configured
ColumnTypeCheck({
	$id: Now.ID['scan_string_max_length'],
	name: 'String Columns Must Have Max Length',
	description: 'Ensures string columns define a maximum length to prevent data quality issues',
	active: true,
	category: 'Best Practice',
	columnType: 'string',
	condition: 'max_length=0',
})

// Validates that custom tables have proper access controls defined
TableCheck({
	$id: Now.ID['scan_table_acl_required'],
	name: 'Custom Tables Must Have ACLs',
	description: 'Ensures custom tables have at least one ACL rule defined for security compliance',
	active: true,
	category: 'Security',
	condition: 'nameSTARTSWITHu_^ORnameSTARTSWITHx_',
})
```
