# Function: Action(config, body)

Creates a reusable custom action that encapsulates a sequence of OOB steps with typed inputs and outputs. Custom actions are invoked from inside a Flow or Subflow via `wfa.action()`.

## Parameters

### config

`ActionDefinition<TInputs, TOutputs>`

Action configuration — name, description, inputs, outputs, and visibility settings.

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`

- **description** (optional): `string`

- **category** (optional): `string`

- **access** (optional): `'public' | 'private'`

- **inputs** (optional): `Record<string, Column>` — Input parameter definitions using column types.

- **outputs** (optional): `Record<string, Column>` — Output parameter definitions using column types.


### body

`(params: { inputs: TInputs }) => void`

The action body function containing sequential `wfa.actionStep()` calls. Each step's return value can be passed to downstream steps via `wfa.dataPill()`.


## Column Types

Import from `@servicenow/sdk/core` for inputs and outputs.

| Type | Description |
|------|-------------|
| `StringColumn` | Text values |
| `IntegerColumn` | Whole numbers |
| `BooleanColumn` | True/false values |
| `ReferenceColumn` | Reference to a ServiceNow table record |
| `DecimalColumn` | Decimal numbers (fixed precision) |
| `FloatColumn` | Floating-point numbers |
| `DateTimeColumn` | Date and time values |

Import from `@servicenow/sdk/automation` for complex types:

| Type | Description |
|------|-------------|
| `FlowObject` | Nested object with typed fields |
| `FlowArray` | Array of typed elements |


## wfa.actionStep()

Embeds an OOB step inside a custom action body. Returns the step's typed outputs for use in downstream steps.

```typescript
const result = wfa.actionStep(
    actionStep.createRecord,
    { $id: Now.ID['step_id'], label: 'Create Record' },
    { create_record_table_name: 'incident', create_record_field_values: TemplateValue({ ... }) }
)
```

| Parameter | Description |
|-----------|-------------|
| `step` | OOB step reference from `actionStep.*` namespace. |
| `$id` | Unique identifier for this step instance. |
| `label` | Display label for this step (optional). |
| `parameters` | Step-specific inputs; supports static values and `wfa.dataPill()`. |


## actionStep

Available OOB steps for use inside custom actions via `wfa.actionStep()`.

| Key | Name | Description |
|-----|------|-------------|
| `askForApproval` | Ask For Approval | Create approvals on any record. Pauses the action until approved, rejected, or cancelled. |
| `createRecord` | Create Record | Creates a record on any ServiceNow table. Use `TemplateValue()` for field values. |
| `createTask` | Create Task | Creates a task on any task table. Optionally waits for task completion. |
| `createOrUpdateRecord` | Create or Update Record | Creates or updates a record by determining if it already exists. |
| `createRecordForRemoteTable` | Create Record for Remote Table | Creates a record on a remote IntegrationHub virtual table. |
| `deleteRecord` | Delete Record | Deletes a record on any ServiceNow table. |
| `deleteMultipleRecords` | Delete Multiple Records | Deletes multiple records matching specified conditions. |
| `email` | Send Email | Sends an email with subject, body, and recipients. |
| `fireEvent` | Fire Event | Fires a system event with parameters. |
| `log` | Log | Logs a message at info, warn, or error level. |
| `lookUpRecord` | Look Up Record | Looks up a single record matching conditions. |
| `lookUpRecords` | Look Up Records | Looks up multiple records matching conditions. |
| `notification` | Send Notification | Sends a notification using a notification record template. |
| `script` | Script | Executes a server-side script. |
| `sms` | Send SMS | Sends an SMS to user or group records. |
| `updateRecord` | Update Record | Updates an existing record on any ServiceNow table. |
| `updateMultipleRecords` | Update Multiple Records | Updates multiple records matching conditions. |
| `waitForCondition` | Wait For Condition | Pauses until the record matches the specified condition. |
| `waitForEmailReply` | Wait For Email Reply | Pauses until an email reply is received. |
| `waitForMessage` | Wait For Message | Pauses until a specific message is received from the flow API. |
| `collectActivityContext` | Collect Activity Context | Collects activity context data. |
| `createAppFromPayload` | Create App From Payload | Creates an application from a payload. |
| `getLatestResponseTextFromEmail` | Get Latest Response Text From Email | Extracts the latest response text from an email thread. |


## Examples

### Custom Action Definition

```typescript
import { Action, wfa, actionStep } from '@servicenow/sdk/automation'
import { StringColumn, BooleanColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const escalateIncident = Action(
    {
        $id: Now.ID['escalate_incident_action'],
        name: 'Escalate Incident',
        description: 'Escalates an incident by updating priority and notifying the assignment group',
        category: 'incident_management',
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
                table: 'incident',
                record: wfa.dataPill(params.inputs.incident, 'reference'),
                values: TemplateValue({
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

### Using a Custom Action in a Flow

```typescript
import { Flow, wfa, trigger } from '@servicenow/sdk/automation'
import { escalateIncident } from '../actions/escalate-incident.now'

export const autoEscalateFlow = Flow(
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

