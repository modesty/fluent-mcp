# Custom Action API example: define a Custom Action and invoke it from a Flow in the same file
```typescript
// Demonstrates the typical pattern: a Custom Action plus a Flow that calls it via wfa.action().
// In a real app, these would normally live in separate files and the Action would be imported.
import { Action, wfa, actionStep, Flow, trigger } from '@servicenow/sdk/automation'
import { StringColumn, BooleanColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const escalateIncident = Action(
    {
        $id: Now.ID['escalate_incident_action'],
        name: 'Escalate Incident',
        description: 'Escalates an incident by updating priority',
        access: 'public',
        inputs: {
            incident: ReferenceColumn({ label: 'Incident', referenceTable: 'incident', mandatory: true }),
            reason: StringColumn({ label: 'Escalation Reason', mandatory: true }),
        },
        outputs: {
            success: BooleanColumn({ label: 'Success' }),
        },
    },
    (params) => {
        wfa.actionStep(
            actionStep.log,
            { $id: Now.ID['log_escalation'], label: 'Log escalation' },
            {
                log_level: 'info',
                log_message: `Incident escalated: ${wfa.dataPill(params.inputs.reason, 'string')}`,
            }
        )
    }
)

Flow(
    {
        $id: Now.ID['auto_escalate_flow'],
        name: 'Auto Escalate Critical Incidents',
    },
    wfa.trigger(
        trigger.record.created,
        { $id: Now.ID['trg_critical_incident'] },
        { table: 'incident', condition: 'priority=1', run_flow_in: 'background' }
    ),
    (params) => {
        wfa.action(
            escalateIncident,
            { $id: Now.ID['escalate_step'] },
            {
                incident: wfa.dataPill(params.trigger.current, 'reference'),
                reason: 'Auto-escalated: Priority 1 incident created',
            }
        )
    }
)
```
