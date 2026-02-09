# UiPolicy API example: basic UI policy with field visibility and mandatory actions
```typescript
import { UiPolicy } from '@servicenow/sdk/core'

UiPolicy({
	$id: Now.ID['vip_caller_policy'],
	table: 'incident',
	shortDescription: 'Make impact mandatory and show VIP field when priority is critical',
	active: true,
	onLoad: true,
	reverseIfFalse: true,
	order: 100,
	conditions: 'priority=1',
	actions: [
		{
			field: 'impact',
			mandatory: true,
			visible: true,
			readOnly: false,
		},
		{
			field: 'u_vip_flag',
			visible: true,
			readOnly: 'ignore',
			mandatory: 'ignore',
		},
		{
			field: 'category',
			mandatory: true,
			visible: 'ignore',
			readOnly: false,
		},
	],
})
```
