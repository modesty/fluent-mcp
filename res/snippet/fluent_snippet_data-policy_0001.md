# DataPolicy API example: server-side mandatory and read-only field rules with a condition
```typescript
import { DataPolicy } from '@servicenow/sdk/core'

DataPolicy({
	$id: Now.ID['high_priority_incident_policy'],
	table: 'incident',
	shortDescription: 'Enforce required fields on high-priority incidents',
	description: 'Server-side enforcement that cannot be bypassed via API, import, or web service',
	active: true,
	conditions: 'priority=1^urgency=1',
	rules: {
		assigned_to: {
			$id: Now.ID['high_priority_incident_policy_assigned_to_rule'],
			mandatory: true,
		},
		assignment_group: {
			$id: Now.ID['high_priority_incident_policy_assignment_group_rule'],
			mandatory: true,
		},
		category: {
			$id: Now.ID['high_priority_incident_policy_category_rule'],
			mandatory: true,
			readOnly: false,
		},
	},
})
```
