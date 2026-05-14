# **Context**: Custom Action spec: Used to create a reusable custom action that encapsulates a sequence of OOB steps with typed inputs and outputs (`sys_hub_action_type_definition`). Custom actions are invoked from inside a Flow or Subflow via `wfa.action()`.

```typescript
// Creates a new reusable Custom Action (`sys_hub_action_type_definition`)
// Imports differ from most Fluent APIs — Action lives in `@servicenow/sdk/automation`.
import { Action, wfa, actionStep } from '@servicenow/sdk/automation'
import { StringColumn, BooleanColumn, IntegerColumn, ReferenceColumn, DecimalColumn, FloatColumn, DateTimeColumn } from '@servicenow/sdk/core'
// For complex input/output types (FlowObject, FlowArray):
// import { FlowObject, FlowArray } from '@servicenow/sdk/automation'

Action(
  {
    $id: '',                  // string | number | ExplicitKey<string>, mandatory
    name: '',                 // string, mandatory — display name of the action
    description: '',          // string, optional — human-readable description
    category: '',             // string, optional — category for grouping in flow designer
    access: 'public',         // 'public' | 'private', optional — controls cross-scope visibility
    inputs: {                 // Record<string, Column>, optional — typed input parameter definitions
      // e.g. incidentRef: ReferenceColumn({ label: 'Incident', referenceTable: 'incident', mandatory: true }),
      // e.g. reason: StringColumn({ label: 'Reason', mandatory: true }),
    },
    outputs: {                // Record<string, Column>, optional — typed output parameter definitions
      // e.g. success: BooleanColumn({ label: 'Success' }),
    },
  },
  (params) => {
    // Action body — sequential `wfa.actionStep()` calls.
    // Each step's return value can be passed to downstream steps via `wfa.dataPill()`.
    // params.inputs is typed from the inputs config above.

    // Example: invoke an OOB step
    // wfa.actionStep(
    //   actionStep.updateRecord,
    //   { $id: Now.ID['step1'], label: 'Update priority' },
    //   { table: 'incident', record: wfa.dataPill(params.inputs.incidentRef, 'reference'), values: TemplateValue({ priority: '1' }) }
    // )
  }
): Action // returns an Action object that can be invoked via wfa.action() inside Flow/Subflow bodies
```

## Available OOB steps (via `actionStep.*`)

| Key | Purpose |
|-----|---------|
| `askForApproval` | Pause until approved/rejected/cancelled |
| `createRecord` | Create a record on any table (use `TemplateValue()` for fields) |
| `createTask` | Create a task on any task table |
| `createOrUpdateRecord` | Upsert a record |
| `createRecordForRemoteTable` | Create record on an IntegrationHub virtual table |
| `deleteRecord` / `deleteMultipleRecords` | Delete one or many records |
| `email` / `notification` / `sms` | Send communications |
| `fireEvent` | Fire a system event with parameters |
| `log` | Log info/warn/error |
| `lookUpRecord` / `lookUpRecords` | Look up records |
| `script` | Execute a server-side script |
| `updateRecord` / `updateMultipleRecords` | Update records |
| `waitForCondition` / `waitForEmailReply` / `waitForMessage` | Pause |
| `collectActivityContext` / `createAppFromPayload` / `getLatestResponseTextFromEmail` | Specialized |

## Column types for `inputs`/`outputs`

From `@servicenow/sdk/core`: `StringColumn`, `IntegerColumn`, `BooleanColumn`, `ReferenceColumn`, `DecimalColumn`, `FloatColumn`, `DateTimeColumn`.

From `@servicenow/sdk/automation`: `FlowObject` (nested typed object), `FlowArray` (array of typed elements).
