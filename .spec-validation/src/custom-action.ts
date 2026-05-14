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
) // returns an Action object that can be invoked via wfa.action() inside Flow/Subflow bodies