# Custom Action API example: define a reusable action that escalates an incident and logs the escalation
```typescript
import { Action, wfa, actionStep } from '@servicenow/sdk/automation'
import { StringColumn, BooleanColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const escalateIncident = Action(
    {
        $id: Now.ID['escalate_incident_action'],
        name: 'Escalate Incident',
        description: 'Escalates an incident by updating priority and logging the escalation',
        category: 'incident_management',
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
            actionStep.updateRecord,
            { $id: Now.ID['update_priority'], label: 'Escalate priority' },
            {
                table_name: 'incident',
                record: wfa.dataPill(params.inputs.incident, 'reference'),
                update_record_field_values: TemplateValue({
                    priority: '1',
                    work_notes: wfa.dataPill(params.inputs.reason, 'string'),
                }),
            }
        )

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
```
