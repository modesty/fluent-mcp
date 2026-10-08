# Flow with hoisted tryCatch / doInParallel outputs (SDK v4.13.0+): a guarded caller lookup whose catch arm reads the try arm's outputs and ends the flow, a parallel group lookup, and a downstream step that references both hoisted outputs
```typescript
import { Flow, wfa, trigger, action } from '@servicenow/sdk/automation'

// Build-verified hoisting rules (SDK v4.13.0+):
// 1. Return outputs with explicit property assignments — `return { callerLookup: callerLookup }`. The shorthand
//    `return { callerLookup }` (as written in the SDK doc/JSDoc examples) is rejected by the Fluent build (TS304).
// 2. Give every action you expose an explicit string-literal `uuid`. Without it a catch-arm reference such as
//    `tryOutputs.callerLookup.Record` fails to build (TS211 "Invalid pill reference"), and outer references build
//    but emit a pill on the tryCatch/doInParallel container instead of on the action itself.
// 3. Only actions declared DIRECTLY in an arm/branch can be exposed; if/forEach/doTheFollowing expose nothing.
export const hoistedOutputsFlow = Flow(
	{
		$id: Now.ID['hoisted_outputs_flow'],
		name: 'Hoisted Outputs Flow',
		description: 'Resolves the caller and assignment group, then logs both from outside the blocks that looked them up',
		runAs: 'system',
	},
	wfa.trigger(
		trigger.record.created,
		{ $id: Now.ID['hoisted_outputs_trigger'] },
		{ table: 'incident', condition: '', run_flow_in: 'background' }
	),
	(params) => {
		// tryCatch: the call's value is the merged outputs of both arms (no output_N — arms are try/catch).
		const guarded = wfa.flowLogic.tryCatch(
			{ $id: Now.ID['caller_guard'], annotation: 'Resolve the caller' },
			{
				try: () => {
					const callerLookup = wfa.action(
						action.core.lookUpRecord,
						{ $id: Now.ID['lookup_caller'], uuid: '57ba43c7-7686-42ae-b615-14ec16b31554' },
						{
							table: 'sys_user',
							conditions: `sys_id=${wfa.dataPill(params.trigger.current.caller_id, 'reference')}`,
						}
					)
					return { callerLookup: callerLookup }
				},
				// The catch arm receives the try arm's outputs as its parameter — never reference the outer
				// `guarded` const from inside the arm. If the arm does not use the parameter, omit it or name it
				// `_tryOutputs`: an unused `tryOutputs` parameter fails the build (TS6133).
				catch: (tryOutputs) => {
					wfa.action(
						action.core.log,
						{ $id: Now.ID['log_caller_failure'] },
						{
							log_level: 'error',
							log_message: `Caller lookup failed: ${wfa.dataPill(tryOutputs.callerLookup.__action_status__.message, 'string')}`,
						}
					)
					// endFlow is allowed inside either tryCatch arm (SDK v4.13.0+); a top-level endFlow is a build error.
					wfa.flowLogic.endFlow({ $id: Now.ID['end_after_caller_failure'] })
				},
			}
		)

		// doInParallel: each branch's returned outputs are exposed positionally as output_0, output_1, …
		const parallel = wfa.flowLogic.doInParallel(
			{ $id: Now.ID['parallel_lookups'], annotation: 'Look up the group while logging' },
			() => {
				const groupLookup = wfa.action(
					action.core.lookUpRecord,
					{ $id: Now.ID['lookup_group'], uuid: '46d2cda3-ac2a-4b0b-ad37-45411ae36f1a' },
					{
						table: 'sys_user_group',
						conditions: `sys_id=${wfa.dataPill(params.trigger.current.assignment_group, 'reference')}`,
					}
				)
				return { groupLookup: groupLookup } // branch 0 → parallel.output_0.groupLookup
			},
			() => {
				// branch 1 is side-effect only and exposes nothing
				wfa.action(
					action.core.log,
					{ $id: Now.ID['log_parallel_branch'] },
					{ log_level: 'info', log_message: 'Group lookup running in parallel' }
				)
			}
		)

		// Downstream: reference the hoisted outputs after the blocks.
		wfa.action(
			action.core.log,
			{ $id: Now.ID['log_resolved'] },
			{
				log_level: 'info',
				log_message: `Caller ${wfa.dataPill(guarded.callerLookup.Record, 'reference')} in group ${wfa.dataPill(parallel.output_0.groupLookup.Record, 'reference')}`,
			}
		)
	}
)
```
