# DataPolicy API example: dot-walk reference rules with table inheritance
```typescript
import { DataPolicy } from '@servicenow/sdk/core'

// Apply to the parent `task` table so all child tables (incident, problem, change)
// inherit the policy. Uses dot-walk to enforce rules on referenced records.
DataPolicy({
	$id: Now.ID['task_assignment_policy'],
	table: 'task',
	shortDescription: 'Require assignment details for in-progress tasks',
	description: 'Inherited by all tables extending task; enforces fields on referenced user records',
	inherit: true,
	conditions: 'state=2',
	reverseIfFalse: true,
	rules: {
		assigned_to: {
			$id: Now.ID['task_assignment_policy_assigned_to_rule'],
			mandatory: true,
		},
		// Dot-walk: make the assigned user's email mandatory
		'assigned_to.email': {
			$id: Now.ID['task_assignment_policy_assigned_to_email_rule'],
			mandatory: true,
		},
		// Dot-walk: protect the assignment group's manager from edits
		'assignment_group.manager': {
			$id: Now.ID['task_assignment_policy_assignment_group_manager_rule'],
			readOnly: true,
		},
	},
})
```
