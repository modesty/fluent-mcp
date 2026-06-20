# PlaybookDefinition API example: playbook with declared inputs and outputs
```typescript
import { PlaybookDefinition, PlaybookTriggerTypes, ActivityDefinitions } from '@servicenow/sdk/automation'
import { wfa } from '@servicenow/sdk/automation'
import { ReferenceColumn, IntegerColumn, StringColumn } from '@servicenow/sdk/core'

PlaybookDefinition(
	{
		$id: Now.ID['p2_incident_notes_io'],
		label: 'P2 Incident Notes with Inputs and Outputs',
		name: 'p2_incident_notes_inputs_outputs',
		parentTable: 'incident',
		inputs: {
			record: ReferenceColumn({ label: 'Record', referenceTable: 'incident', mandatory: true }),
			priority: IntegerColumn({ label: 'Priority Override', default: 3 }),
			summary: StringColumn({ label: 'Summary', maxLength: 1000 }),
		},
		outputs: {
			resolvedBy: ReferenceColumn({ label: 'Resolved By', referenceTable: 'sys_user' }),
			closureCode: StringColumn({ label: 'Closure Code', maxLength: 40 }),
		},
	},
	{
		triggers: [
			wfa.playbook.trigger(
				PlaybookTriggerTypes.RecordCreate,
				{ $id: Now.ID['p2_trig_io'], label: 'On P2 Incident Creation' },
				{ table: 'incident', condition: 'priority=2' },
				(trigger) => ({
					record: wfa.playbook.dataPill(trigger.current),
					priority: wfa.playbook.dataPill(trigger.current.priority),
				})
			),
		],
	},
	{
		lanes: (params) => ({
			stamp_note: wfa.playbook.lane({
				config: {
					$id: Now.ID['p2_lane'],
					label: 'Stamp Note',
					order: 1,
					startRule: wfa.playbook.run.Immediately(),
					restartRule: 'RUN_ONLY_ONCE',
				},
				activities: () => {
					const stamp = wfa.playbook.activity(
						ActivityDefinitions.Core.UpdateRecord,
						{
							$id: Now.ID['p2_act'],
							label: 'Stamp Note',
							order: 1,
							startRule: wfa.playbook.run.Immediately(),
							restartRule: 'RUN_ONLY_ONCE',
						},
						{
							table_name: 'incident',
							record: wfa.playbook.dataPill(params.parentRecord),
							values: TemplateValue({ work_notes: 'Priority 2 incident received' }),
						}
					)
					return { stamp: stamp }
				},
			}),
		}),
	}
)
```
