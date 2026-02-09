# ImportSet API example: basic import set with simple field mappings
```typescript
import { ImportSet } from '@servicenow/sdk/core'

ImportSet({
	$id: Now.ID['user_import_transform'],
	name: 'User Import Transform',
	targetTable: 'sys_user',
	sourceTable: 'u_user_import',
	active: true,
	order: 100,
	runBusinessRules: true,
	fields: {
		user_name: 'u_username',
		first_name: 'u_first_name',
		last_name: 'u_last_name',
		email: 'u_email_address',
		department: 'u_department',
		title: 'u_job_title',
	},
})
```
