# Flow with stages, try/catch, and parallel execution (SDK v4.7.0+): tracks progress through named stages, guards a lookup with tryCatch, and sends notifications in parallel
```typescript
import { Flow, FlowStage, wfa, trigger, action } from '@servicenow/sdk/automation'

export const incidentIntakeFlow = Flow(
	{
		$id: Now.ID['incident_intake_flow'],
		name: 'Incident Intake Flow',
		description: 'Stage-tracked intake with error handling and parallel notifications',
		runAs: 'system',
		stages: {
			triage: FlowStage({ label: 'Triage', value: 'triage' }),
			notify: FlowStage({
				label: 'Notify',
				value: 'notify',
				alwaysShow: true,
				states: { inProgress: 'Notifying stakeholders', complete: 'Stakeholders notified' },
			}),
		},
	},
	wfa.trigger(
		trigger.record.created,
		{ $id: Now.ID['intake_trigger'] },
		{ table: 'incident', condition: '', run_flow_in: 'background' }
	),
	(params) => {
		// ── Stage 1: Triage ──
		wfa.stage(params.stages.triage)

		// Guard the lookup: if it fails, log the error instead of aborting the flow
		wfa.flowLogic.tryCatch(
			{ $id: Now.ID['lookup_guard'], annotation: 'Resolve caller details' },
			{
				try: () => {
					wfa.action(
						action.core.lookUpRecord,
						{ $id: Now.ID['lookup_caller'] },
						{
							table: 'sys_user',
							conditions: `sys_id=${wfa.dataPill(params.trigger.current.caller_id, 'reference')}`,
						}
					)
				},
				catch: () => {
					wfa.action(
						action.core.log,
						{ $id: Now.ID['log_lookup_error'] },
						{ log_level: 'error', log_message: 'Caller lookup failed' }
					)
				},
			}
		)

		// ── Stage 2: Notify (in parallel) ──
		wfa.stage(params.stages.notify)

		wfa.flowLogic.doInParallel(
			{ $id: Now.ID['parallel_notify'], annotation: 'Notify stakeholders concurrently' },
			() => {
				wfa.action(
					action.core.sendNotification,
					{ $id: Now.ID['notify_manager'] },
					{
						table_name: 'incident',
						record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
						notification: 'incident_manager_notification',
					}
				)
			},
			() => {
				wfa.action(
					action.core.log,
					{ $id: Now.ID['log_notify'] },
					{ log_level: 'info', log_message: 'Stakeholder notifications dispatched' }
				)
			}
		)
	}
)
```
