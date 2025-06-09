# create two user preferences to customize the rowcount and the admin email address
```typescript
import { UserPreference } from '@servicenow/sdk/core'

// Sets the number of rows displayed in a list to 50
UserPreference({
	$id: Now.ID['rowcount'],
	name: 'rowcount',
	type: 'integer',
	value: 50,
	description: 'The maximum number of rows that display on a single page in a list.',
	system: false
})

// Sets the admin_email preference to `admin@example.com`
UserPreference({
    $id: Now.ID['admin_email'],
	name: 'admin_email',
    type: 'string',
    value: 'admin@example.com',
})
```
