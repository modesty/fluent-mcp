# PlaybookDefinition API example: P1 incident playbook with one trigger that stamps a work note
```typescript
import { PlaybookDefinition, PlaybookTriggerTypes, ActivityDefinitions } from '@servicenow/sdk/automation'
import { wfa } from '@servicenow/sdk/automation'

PlaybookDefinition(
	{
		$id: Now.ID['p1_incident_notes'],
		label: 'P1 Incident Notes',
		name: 'p1_incident_notes',
		parentTable: 'incident',
	},
	{
		triggers: [
			wfa.playbook.trigger(
				PlaybookTriggerTypes.RecordCreate,
				{ $id: Now.ID['p1_trig'], label: 'On P1 Incident' },
				{ table: 'incident', condition: 'priority=1' }
			),
		],
	},
	{
		lanes: (params) => ({
			stamp_note: wfa.playbook.lane({
				config: {
					$id: Now.ID['p1_lane'],
					label: 'Stamp Note',
					order: 1,
					startRule: wfa.playbook.run.Immediately(),
					restartRule: 'RUN_ONLY_ONCE',
				},
				activities: () => {
					const stamp = wfa.playbook.activity(
						ActivityDefinitions.Core.UpdateRecord,
						{
							$id: Now.ID['p1_act'],
							label: 'Stamp Note',
							order: 1,
							startRule: wfa.playbook.run.Immediately(),
							restartRule: 'RUN_ONLY_ONCE',
						},
						{
							table_name: 'incident',
							record: wfa.playbook.dataPill(params.parentRecord),
							values: TemplateValue({ work_notes: 'Priority 1 received' }),
						}
					)
					return { stamp: stamp }
				},
			}),
		}),
	}
)
```
