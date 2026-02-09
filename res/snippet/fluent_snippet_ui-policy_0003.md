# UiPolicy API example: UI policy with related list actions and field messages
```typescript
import { UiPolicy } from '@servicenow/sdk/core'

UiPolicy({
	$id: Now.ID['resolved_incident_policy'],
	table: 'incident',
	shortDescription: 'Hide related lists and show messages when incident is resolved',
	active: true,
	onLoad: true,
	reverseIfFalse: true,
	inherit: true,
	order: 150,
	conditions: 'state=6',
	uiType: 'desktop',
	description: 'When an incident is in resolved state, lock down editing and hide activity-related lists',
	actions: [
		{
			field: 'short_description',
			readOnly: true,
			mandatory: 'ignore',
			visible: 'ignore',
		},
		{
			field: 'description',
			readOnly: true,
			mandatory: 'ignore',
			visible: 'ignore',
		},
		{
			field: 'close_code',
			mandatory: true,
			visible: true,
			readOnly: false,
			fieldMessage: 'Please select a close code before closing this incident',
			fieldMessageType: 'info',
		},
		{
			field: 'close_notes',
			mandatory: true,
			visible: true,
			readOnly: false,
		},
		{
			field: 'assigned_to',
			readOnly: true,
			cleared: false,
		},
	],
	relatedListActions: [
		{
			list: 'incident.task',
			visible: false,
		},
		{
			list: 'REL:' + Now.ID['incident_child_incidents'],
			visible: false,
		},
	],
})
```
