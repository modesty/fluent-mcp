# Branch a playbook with variants, variant-only activities, and variant overrides in ServiceNow Fluent
```typescript
import { PlaybookDefinition, PlaybookTriggerTypes, ActivityDefinitions } from '@servicenow/sdk/automation'
import { wfa } from '@servicenow/sdk/automation'

PlaybookDefinition(
	{
		$id: Now.ID['p3_incident_variants'],
		label: 'P3 Incident Review with Variants',
		name: 'p3_incident_review_variants',
		parentTable: 'incident', // REQUIRED once any variant is declared (build error otherwise)
		// Defer variant selection until the assessment step completes (default: evaluate at playbook start).
		// Variant conditions may then read outputs of activities that STRICTLY precede it (here: triage).
		evaluateVariantChildrenAfter: Now.ID['p3_act_assess'],
	},
	{
		triggers: [
			wfa.playbook.trigger(
				PlaybookTriggerTypes.RecordCreate,
				{ $id: Now.ID['p3_trig'], label: 'On Incident Created' },
				{ table: 'incident', condition: 'priority<=2' }
			),
		],
		// Variants live in arg 2 next to triggers; the lanes callback sees them as params.variants.<name>.
		variants: (params) => {
			const vip = wfa.playbook.variant({
				$id: Now.ID['p3_var_vip'],
				label: 'VIP Caller',
				condition: `${wfa.playbook.dataPill(params.parentRecord.caller_id.vip)}=true`,
				order: 1,
				color: 'purple',
			})
			const vipCritical = wfa.playbook.variant({
				$id: Now.ID['p3_var_vip_critical'],
				label: 'VIP Critical',
				// Only evaluated when the parent variant (vip) matched. May read triage outputs because
				// triage is an ancestor of the evaluateVariantChildrenAfter activity (assess).
				condition: `${wfa.playbook.dataPill(wfa.playbook.activityRef(Now.ID['p3_act_triage']).outputs.record.priority)}=1`,
				order: 1,
				parentVariant: vip, // sibling local identifier, not params.variants
			})
			return { vip: vip, vipCritical: vipCritical }
		},
	},
	{
		lanes: (params) => ({
			review: wfa.playbook.lane({
				config: {
					$id: Now.ID['p3_lane_review'],
					label: 'Review',
					order: 1,
					startRule: wfa.playbook.run.Immediately(),
					restartRule: 'RUN_ONLY_ONCE',
				},
				activities: () => {
					const triage = wfa.playbook.activity(
						ActivityDefinitions.Core.RecordForm,
						{
							$id: Now.ID['p3_act_triage'],
							label: 'Triage',
							order: 1,
							startRule: wfa.playbook.run.Immediately(),
							restartRule: 'RUN_ONLY_ONCE',
						}
					)
					// The variant evaluation point.
					const assess = wfa.playbook.activity(
						ActivityDefinitions.Core.Instruction,
						{
							$id: Now.ID['p3_act_assess'],
							label: 'Assess Impact',
							order: 2,
							startRule: wfa.playbook.run.After(triage),
							restartRule: 'RUN_ONLY_ONCE',
						},
						{ message: 'Confirm impact and urgency before work is routed.' }
					)
					// Variant-only activity: exists only when the VIP variant is selected. Must run after the
					// evaluation point (build error otherwise).
					const vipGreeting = wfa.playbook.activity(
						ActivityDefinitions.Core.Instruction,
						{
							$id: Now.ID['p3_act_vip_greeting'],
							label: 'VIP Greeting',
							order: 3,
							startRule: wfa.playbook.run.After(assess),
							restartRule: 'RUN_ONLY_ONCE',
							variant: params.variants.vip,
						},
						{ message: 'Call the VIP caller within 15 minutes.' }
					)
					// Base activity with a per-variant override; `variant` and `variantOverrides` are mutually exclusive.
					const resolve = wfa.playbook.activity(
						ActivityDefinitions.Core.Instruction,
						{
							$id: Now.ID['p3_act_resolve'],
							label: 'Resolve',
							order: 4,
							startRule: wfa.playbook.run.After(assess),
							restartRule: 'RUN_ONLY_ONCE',
							variantOverrides: [
								// For VIP Critical, wait on the later-declared hand-off; activityRef() is the
								// forward reference that Run.After() only accepts inside a variant override.
								{
									variant: params.variants.vipCritical,
									startRule: wfa.playbook.run.After(wfa.playbook.activityRef(Now.ID['p3_act_handoff'])),
								},
							],
						},
						{ message: 'Resolve the incident and notify the caller.' }
					)
					const handoff = wfa.playbook.activity(
						ActivityDefinitions.Core.Instruction,
						{
							$id: Now.ID['p3_act_handoff'],
							label: 'Major Incident Hand-off',
							order: 5,
							startRule: wfa.playbook.run.After(assess),
							restartRule: 'RUN_ONLY_ONCE',
							variant: params.variants.vipCritical,
						},
						{ message: 'Hand off to the Major Incident Manager.' }
					)
					return { triage: triage, assess: assess, vipGreeting: vipGreeting, resolve: resolve, handoff: handoff }
				},
			}),
		}),
	}
)
```
