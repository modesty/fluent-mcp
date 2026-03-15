# **Context:** Flow API spec: Used to create a ServiceNow Flow (`sys_hub_flow`) — a workflow-as-code automation that reacts to triggers and executes actions. Flows are defined in TypeScript using the Fluent `Flow()` function from `@servicenow/sdk/automation`

```typescript
// Creates a Flow (`sys_hub_flow`)
// Import from @servicenow/sdk/automation, NOT @servicenow/sdk/core
import { Flow, wfa, trigger, action } from '@servicenow/sdk/automation'

Flow(
    // 1. Flow definition config
    {
        $id: Now.ID['my_flow'], // string | Now.ID key, mandatory — unique identifier
        name: '',               // string, mandatory — display name of the flow
        description: '',        // string, optional — purpose description
        runAs: 'system',        // 'system' | 'user', optional — execution context
        runWithRoles: [],       // (string | Role)[], optional — roles to run flow with
        flowPriority: 'LOW',    // 'LOW' | 'MEDIUM' | 'HIGH', optional — execution priority
        protection: 'read',     // 'read' | '', optional — 'read' makes flow read-protected
        flowVariables: {},      // Record<string, FlowValueType>, optional — typed flow-level variables accessible throughout the flow body
    },
    // 2. Trigger instance — created via wfa.trigger()
    wfa.trigger(
        trigger.record.created,              // TriggerDefinition — the built-in trigger type (see below)
        { $id: Now.ID['my_trigger'] },       // { $id: string }, mandatory — unique id for this trigger instance
        { table: 'incident', condition: '' } // TriggerInputTypes — inputs required by the trigger
    ),
    // 3. Flow body — callback receiving params.trigger (trigger outputs) and params.flowVariables
    (params) => {
        // Use wfa.action(), wfa.flowLogic.*, wfa.dataPill() inside here
    }
)

// ─── BUILT-IN TRIGGERS (import { trigger } from '@servicenow/sdk/automation') ───

// Record triggers
trigger.record.created          // fires when a record is inserted
trigger.record.updated          // fires when a record is updated
trigger.record.createdOrUpdated // fires on insert or update

// Scheduled triggers
trigger.scheduled.daily         // runs once per day
trigger.scheduled.weekly        // runs once per week
trigger.scheduled.monthly       // runs once per month
trigger.scheduled.repeat        // repeats on a defined interval
trigger.scheduled.runOnce       // runs exactly once at a specified time

// Application triggers
trigger.application.inboundEmail        // fires on inbound email events
trigger.application.remoteTableQuery    // fires for remote table query events
trigger.application.knowledgeManagement // fires for knowledge management events
trigger.application.slaTask             // fires for SLA task events

// Service Catalog trigger (SDK 4.4.0)
trigger.application.serviceCatalog // fires when a catalog item request item is created

// ─── TRIGGER INPUTS (vary by trigger type) ───
// For record triggers:
{
    table: '',          // string (TableName), mandatory — the table to watch
    condition: '',      // string, optional — encoded query condition to filter which records fire the trigger
    run_flow_in: 'background', // 'any' | 'background' | 'foreground', optional
}

// For scheduled.daily:
{
    time: '00:00:00',   // string, optional — time of day to run (HH:MM:SS)
}

// For scheduled.repeat:
{
    repeat: Duration({ hours: 1 }), // Duration, mandatory — repeat interval
}

// For scheduled.runOnce:
{
    run_in: '', // string, mandatory — datetime string (YYYY-MM-DD HH:mm:ss)
}

// ─── FLOW ACTIONS (wfa.action) ───
// Syntax: wfa.action(action.core.<actionName>, { $id: Now.ID['step_id'] }, { ...inputs })

// Record operations
wfa.action(action.core.createRecord,  { $id: Now.ID['step'] }, { table_name: '', values: {} })
wfa.action(action.core.updateRecord,  { $id: Now.ID['step'] }, { table_name: '', record: dataPill, values: {} })
wfa.action(action.core.deleteRecord,  { $id: Now.ID['step'] }, { table_name: '', record: dataPill })
wfa.action(action.core.lookUpRecord,  { $id: Now.ID['step'] }, { table: '', conditions: '' })
wfa.action(action.core.lookUpRecords, { $id: Now.ID['step'] }, { table: '', conditions: '' })

// Communication
wfa.action(action.core.sendNotification, { $id: Now.ID['step'] }, { table_name: '', record: dataPill, notification: '' })
wfa.action(action.core.sendEmail,        { $id: Now.ID['step'] }, { ah_to: '', ah_subject: '', ah_body: '' })
wfa.action(action.core.sendSms,          { $id: Now.ID['step'] }, { recipients: [], message: '' })
wfa.action(action.core.askForApproval,   { $id: Now.ID['step'] }, { table: '', record: dataPill, approval_conditions: '' })

// Logging and utilities
wfa.action(action.core.log,        { $id: Now.ID['step'] }, { log_level: 'info', log_message: '' })
wfa.action(action.core.scriptStep, { $id: Now.ID['step'] }, { script: '' })

// Service Catalog actions (SDK 4.4.0)
wfa.action(action.core.getCatalogVariables,      { $id: Now.ID['step'] }, { requested_item: dataPill, template_catalog_item: '' })
wfa.action(action.core.createCatalogTask,        { $id: Now.ID['step'] }, { ah_requested_item: dataPill })
wfa.action(action.core.submitCatalogItemRequest, { $id: Now.ID['step'] }, { catalog_item: '' })

// ─── FLOW LOGIC ───
wfa.flowLogic.if(
    { $id: Now.ID['check_cond'], condition: '' }, // condition: encoded query string or data pill expression
    () => { /* actions when true */ }
)
wfa.flowLogic.elseIf(
    { $id: Now.ID['check_cond2'], condition: '' },
    () => { /* actions */ }
)
wfa.flowLogic.else(
    { $id: Now.ID['else_branch'] },
    () => { /* actions */ }
)
wfa.flowLogic.forEach(
    dataPill,                      // array data pill to iterate over
    { $id: Now.ID['loop_id'] },
    () => { /* loop body actions */ }
)
wfa.flowLogic.waitForADuration({
    $id: Now.ID['wait_id'],
    durationType: 'explicit_duration',
    duration: Duration({ minutes: 30 }),
})
wfa.flowLogic.exitLoop({ $id: Now.ID['exit_id'] })
wfa.flowLogic.endFlow({ $id: Now.ID['end_id'] })
wfa.flowLogic.skipIteration({ $id: Now.ID['skip_id'] })
wfa.flowLogic.setFlowVariables({ $id: Now.ID['set_vars'] }, { varName: value })

// ─── DATA PILLS (wfa.dataPill) ───
// References output fields from previous steps, with type-safe dot-walking
wfa.dataPill(params.trigger.current.sys_id, 'reference')  // reference type data pill
wfa.dataPill(params.trigger.current.short_description, 'string')  // string type data pill
wfa.dataPill(params.trigger.current.additional_assignee_list, 'array.string') // array type

// ─── FLOW VARIABLES ───
// Declare typed variables in the config object; access them in body via params.flowVariables
import { StringColumn, IntegerColumn } from '@servicenow/sdk/core'
Flow(
    {
        $id: Now.ID['my_flow'],
        name: 'My Flow',
        flowVariables: {
            counter: IntegerColumn({ label: 'Counter' }),
            status: StringColumn({ label: 'Status' }),
        },
    },
    wfa.trigger(trigger.record.created, { $id: Now.ID['trigger'] }, { table: 'incident' }),
    (params) => {
        // params.flowVariables.counter, params.flowVariables.status are typed
    }
)
```
