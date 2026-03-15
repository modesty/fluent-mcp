# **Context:** Sla API spec: Used to create a ServiceNow SLA definition (`contract_sla`) — a Service Level Agreement that tracks time-based commitments for task records. Uses the `Duration()` helper for time values.

```typescript
import { Sla, Duration } from '@servicenow/sdk/core'

// Creates a new SLA definition (`contract_sla`)
Sla({
    $id: Now.ID['my_sla'], // string | Now.ID key, mandatory — unique identifier

    // ─── Core fields ───
    name: '',               // string, optional — display name of the SLA
    table: 'incident',      // string (TableName), optional — table the SLA applies to, default: 'incident'
    type: 'SLA',            // 'SLA' | 'OLA' | 'Underpinning contract', optional — type of agreement, default: 'SLA'
    active: true,           // boolean, optional — whether the SLA is active, default: true
    target: 'resolution',   // 'response' | 'resolution', optional — which timing target to track
    domainPath: '/',        // string, optional — domain path, default: '/'

    // ─── Duration ───
    // Use EITHER `duration` (fixed) OR `durationType` (relative), not both.
    duration: Duration({ hours: 4, minutes: 0 }), // Duration, mandatory when durationType is not set
    // duration accepts: hours, minutes, seconds, days — e.g. Duration({ days: 1, hours: 2, minutes: 30 })

    durationType: '',       // string | Record<'cmn_relative_duration'>, optional — relative duration reference (replaces duration)
    relativeDurationWorksOn: 'Task record', // 'Task record' | 'SLA record', optional — default: 'Task record'

    // ─── Schedule ───
    // schedule is mandatory when scheduleSource is 'sla_definition' (default)
    schedule: '',           // string | Record<'cmn_schedule'>, optional — sys_id of the schedule record
    scheduleSource: 'sla_definition', // 'sla_definition' | 'task_field' | 'no_schedule', optional — default: 'sla_definition'
    scheduleSourceField: '', // string, mandatory when scheduleSource is 'task_field' — field name holding the schedule reference

    // ─── Timezone ───
    timezoneSource: 'task.caller_id.time_zone', // optional, typed string:
    // 'task.caller_id.time_zone' | 'task.caller_id.location.time_zone'
    // | 'task.cmdb_ci.location.time_zone' | 'task.location.time_zone' | 'sla.timezone'
    timezone: '',           // string (timezone name), optional — only used when timezoneSource is 'sla.timezone'

    // ─── Conditions ───
    conditions: {           // SLAConditionsObject, optional
        start: '',          // string, optional — encoded query that starts the SLA timer
        stop: '',           // string, optional — encoded query that stops the SLA timer
        pause: '',          // string, optional — encoded query that pauses the SLA timer
        resume: '',         // string, optional — encoded query to resume (requires whenTo.resume: 'on_condition')
        reset: '',          // string, optional — encoded query to reset the SLA timer
        cancel: '',         // string, optional — encoded query to cancel (requires whenTo.cancel: 'on_condition')
    },
    advancedConditionType: 'none', // 'none' | 'advanced' | 'advanced_journal' | 'advanced_system' | 'advanced_journal_and_system', optional
    conditionType: '',      // string | Record<'sla_condition_class'>, optional — task SLA condition class reference

    // ─── Behavior ───
    resetAction: 'cancel',  // 'cancel' | 'complete', optional — action taken when reset condition is met, default: 'cancel'
    whenTo: {               // optional
        resume: 'on_condition', // 'no_match' | 'on_condition', optional — when to resume after pause, default: 'on_condition'
        cancel: 'on_condition', // 'no_match' | 'on_condition' | 'never', optional — when to cancel, default: 'on_condition'
    },

    // ─── Retroactive ───
    retroactive: {          // optional
        start: false,       // boolean, optional — retroactively start the SLA, default: false
        pause: true,        // boolean, optional — retroactively pause, only when start: true, default: true
        setStartTo: 'sys_created_on', // mandatory when start: true, typed string:
        // 'work_end' | 'work_start' | 'approval_set' | 'closed_at' | 'sys_created_on'
        // | 'due_date' | 'expected_start' | 'follow_up' | 'reopened_time' | 'opened_at'
        // | 'resolved_at' | 'sys_updated_on'
    },

    // ─── Other ───
    enableLogging: false,   // boolean, optional — enable detailed SLA logging, default: false
    overrides: '',          // string | Record<'contract_sla'>, optional — sys_id of an SLA this overrides
    workflow: '',           // string | Record<'wf_workflow'>, optional — workflow to trigger on breach
    flow: '',               // string | Record<'sys_hub_flow'>, optional — flow to trigger on breach
    vendor: '',             // string | Record<'core_company'>, optional — vendor/company reference
}): Sla // returns an Sla object
```
