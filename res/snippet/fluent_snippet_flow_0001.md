# Incident severity alert flow: triggers on incident creation, branches by severity (high/medium), notifies stakeholders via notification and SMS, then sets state to In Progress

```typescript
import { Flow, wfa, trigger, action } from '@servicenow/sdk/automation'

export const incidentSeverityAlertFlow = Flow(
    {
        $id: Now.ID['incident_severity_alert_flow'],
        name: 'Incident Severity Alert Flow',
        description: 'Notifies team based on incident severity and sets state to In Progress',
        runAs: 'system',
    },
    wfa.trigger(
        trigger.record.created,
        { $id: Now.ID['incident_created_trigger'] },
        { table: 'incident', condition: 'origin=NULL', run_flow_in: 'background' }
    ),
    (params) => {
        // Log the new incident
        wfa.action(
            action.core.log,
            { $id: Now.ID['log_incident'] },
            {
                log_level: 'info',
                log_message: `New incident: ${wfa.dataPill(params.trigger.current.short_description, 'string')}`,
            }
        )

        // High severity — notify manager + SMS all assignees
        wfa.flowLogic.if(
            {
                $id: Now.ID['check_high_severity'],
                condition: `${wfa.dataPill(params.trigger.current.severity, 'string')}=1`,
            },
            () => {
                wfa.action(
                    action.core.sendNotification,
                    { $id: Now.ID['notify_manager_high'] },
                    {
                        table_name: 'incident',
                        record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
                        notification: 'high_severity_manager_notification',
                    }
                )

                wfa.flowLogic.forEach(
                    wfa.dataPill(params.trigger.current.additional_assignee_list, 'array.string'),
                    { $id: Now.ID['foreach_assignees_high'] },
                    () => {
                        wfa.action(
                            action.core.sendSms,
                            { $id: Now.ID['sms_assignee_high'] },
                            {
                                recipients: wfa.dataPill(params.trigger.current.additional_assignee_list, 'array.string'),
                                message: `High severity incident: ${wfa.dataPill(params.trigger.current.short_description, 'string')}`,
                            }
                        )
                    }
                )
            }
        )

        // Medium severity — SMS assignees only
        wfa.flowLogic.elseIf(
            {
                $id: Now.ID['check_medium_severity'],
                condition: `${wfa.dataPill(params.trigger.current.severity, 'string')}=2`,
            },
            () => {
                wfa.flowLogic.forEach(
                    wfa.dataPill(params.trigger.current.additional_assignee_list, 'array.string'),
                    { $id: Now.ID['foreach_assignees_medium'] },
                    () => {
                        wfa.action(
                            action.core.sendSms,
                            { $id: Now.ID['sms_assignee_medium'] },
                            {
                                recipients: wfa.dataPill(params.trigger.current.additional_assignee_list, 'array.string'),
                                message: `Medium severity incident: ${wfa.dataPill(params.trigger.current.short_description, 'string')}`,
                            }
                        )
                    }
                )
            }
        )

        // Always set state to In Progress (2)
        wfa.action(
            action.core.updateRecord,
            { $id: Now.ID['set_state_in_progress'] },
            {
                table_name: 'incident',
                record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
                values: { state: '2' },
            }
        )
    }
)
```
