# Retry a playbook stage with Go Back from a match_first decision with an ideal-path else branch in ServiceNow Fluent
```typescript
import { PlaybookDefinition, PlaybookTriggerTypes, ActivityDefinitions } from '@servicenow/sdk/automation'
import { wfa } from '@servicenow/sdk/automation'

PlaybookDefinition(
	{
		$id: Now.ID['p4_resolution_check'],
		label: 'P4 Resolution Check with Go Back',
		name: 'p4_resolution_check',
		parentTable: 'incident',
	},
	{
		triggers: [
			wfa.playbook.trigger(
				PlaybookTriggerTypes.RecordUpdate,
				{ $id: Now.ID['p4_trig'], label: 'On Incident Resolved' },
				{ table: 'incident', condition: 'state=6' }
			),
		],
	},
	{
		lanes: (params) => {
			// Go Back target: restartRule 'RUN_ALWAYS' so the stage re-runs on the jump back
			// (any other restartRule is a build WARNING and the stage is silently skipped).
			const fix = wfa.playbook.lane({
				config: {
					$id: Now.ID['p4_lane_fix'],
					label: 'Apply Fix',
					order: 1,
					startRule: wfa.playbook.run.Immediately(),
					restartRule: 'RUN_ALWAYS',
				},
				activities: () => {
					const applyFix = wfa.playbook.activity(
						ActivityDefinitions.Core.RecordForm,
						{
							$id: Now.ID['p4_act_apply_fix'],
							label: 'Apply Fix',
							order: 1,
							startRule: wfa.playbook.run.Immediately(),
							restartRule: 'RUN_ALWAYS',
						}
					)
					return { applyFix: applyFix }
				},
			})

			// Stage-level Decision (declared between lanes). Go Back requires 'match_first'.
			const verify = wfa.playbook.activity(
				ActivityDefinitions.Core.Decision,
				{
					$id: Now.ID['p4_act_verify'],
					label: 'Fix Verified?',
					order: 2,
					startRule: wfa.playbook.run.After(fix),
					restartRule: 'RUN_ALWAYS',
				},
				{
					type: 'match_first',
					branches: [
						{
							id: 'reopened',
							label: 'Caller Reopened',
							condition: `${wfa.playbook.dataPill(params.parentRecord.state)}=2`,
						},
						// isIdealPath marks the golden path: at most ONE ideal branch on a match_first decision,
						// and 'else' may not be ideal alongside a conditional branch. Needs sn_pa_designer 29.6.4+.
						{ id: 'else', label: 'Else', isIdealPath: true },
					],
				}
			)

			// Go Back: only valid as the TERMINAL activity of a match_first branch, and at least one
			// branch must not dead-end in a Go Back. Targets are raw lane/activity variables.
			const retryFix = wfa.playbook.activity(
				ActivityDefinitions.Core.GoBack,
				{
					$id: Now.ID['p4_act_retry_fix'],
					label: 'Retry Fix',
					order: 3,
					startRule: wfa.playbook.run.After(verify.branches.reopened),
					restartRule: 'RUN_ALWAYS',
				},
				{ target_type: 'go_back_to_target_stage', go_back_to_target_stage: fix }
			)

			const close = wfa.playbook.activity(
				ActivityDefinitions.Core.Instruction,
				{
					$id: Now.ID['p4_act_close'],
					label: 'Close Incident',
					order: 4,
					startRule: wfa.playbook.run.After(verify.branches.else),
					restartRule: 'RUN_ONLY_ONCE',
				},
				{ message: 'Fix verified - close the incident.' }
			)

			return { fix: fix, verify: verify, retryFix: retryFix, close: close }
		},
	}
)
```
