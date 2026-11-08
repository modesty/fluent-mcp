# UiPolicy API example: UI policy with related list actions and field messages
```typescript
import { UiPolicy } from '@servicenow/sdk/core'

export const resolvedIncidentPolicy = UiPolicy({
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
	// Each `list` is '<child_table>.<reference_field>' for a reference-based related list, or the sys_id
	// (or a Record<'sys_relationship'>) of a relationship. Never add the 'REL:' prefix; the plugin writes it.
	relatedListActions: [
		{
			list: 'incident_task.incident', // Incident Tasks
			visible: false,
		},
		{
			list: 'incident.parent_incident', // Child Incidents
			visible: false,
		},
	],
})
```
