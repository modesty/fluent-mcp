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
    protectionPolicy: '',     // 'read' | '', optional (SDK v4.7.0+) — if 'read', the action body is read-protected in the runtime (default: '')
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

## Dependent-field resolution (SDK v4.11.0+)

The object returned by `Action()` now carries a `rawInputs` member alongside the existing
`rawOutputs` — `Action<I, O, RawI, RawO>` where it used to be `Action<I, O, RawO>`. Both are
**inference machinery, not authored properties**: never write `rawInputs` in an `Action()` config.

What it changes for authors is that `wfa.action(...)` call sites can now type-check an input against
the table chosen by a *sibling* input, the same way outputs already resolved. Concretely, a
`table_name`-dependent `record` input rejects a data pill from the wrong table — passing an
`incident` record pill to an action whose `table_name` is `sys_user` is now a compile error instead
of a runtime surprise.

The release note's related item — "Allowed `Decimal` values inside `FlowObject`/`FlowArray`
structures" — is **not** an authoring-surface change: `FlowTypes.d.ts` (which defines
`FlowValueType`, `FlowObjectType` and `FlowArrayType`) and `db/types/Decimal.d.ts` are both
byte-identical to v4.10.1. `Decimal` already reached these structures through the `Column` arm of
`FlowValueType`; the fix is in the build/transform pipeline, so nothing changes in how you declare
them.
