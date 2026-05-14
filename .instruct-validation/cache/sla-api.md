# Function: Sla(config)

Creates an SLA definition (`contract_sla`): a timer that tracks service commitments
against task records. SLAs measure response time, resolution time, or other
time-based targets by starting, pausing, resuming, and stopping a clock based on
configurable conditions.

## Usage

```ts
import { Sla } from '@servicenow/sdk/core'

Sla({
    $id: Now.ID['p1-incident-response'],
    name: 'Priority 1 Incident Response',
    table: 'incident',
    duration: Duration({ hours: 4 }),
    schedule: 'b1992362eb601100fcfb858ad106fe16',
    conditions: {
        start: 'priority=1',
        stop: 'state=6',
    },
})
```

## Parameters

### config

`Sla`

The SLA configuration object.

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (optional): `string`
  Display name of the SLA definition shown in admin views and reports.

- **table** (optional, default: `'incident'`): `keyof Tables`
  The task table this SLA applies to. The SLA timer attaches to records in this table.

- **type** (optional, default: `'SLA'`): `'SLA' | 'OLA' | 'Underpinning contract'`
  The kind of service agreement.
    - **SLA**: Service Level Agreement between the IT organization and its customers.
    - **OLA**: Operational Level Agreement between internal IT groups.
    - **Underpinning contract**: Agreement with an external vendor or supplier.

- **active** (optional, default: `true`): `boolean`
  Controls whether this SLA definition is evaluated against new task records.
  Inactive SLAs stop attaching to new records but do not affect already-running timers.

- **target** (optional): `'response' | 'resolution'`
  Whether this SLA measures response time (first meaningful action) or resolution
  time (issue fully resolved). Affects reporting and which SLA fields are populated
  on the task.

- **domainPath** (optional, default: `'/'`): `string`
  Domain path for domain-separated instances. Controls which domain this SLA
  definition belongs to.

### Duration and Schedule

These properties control how the SLA timer calculates elapsed time.

- **duration** (optional): `Duration`
  Fixed duration for the SLA. Use the global `Duration()` helper.
  Required when `durationType` is not set (user-specified duration mode).

  ```ts
  duration: Duration({ hours: 4 })
  duration: Duration({ days: 1, hours: 2, minutes: 30 })
  ```

- **durationType** (optional): `string | Record<'cmn_relative_duration'>`
  Reference to a relative duration record that calculates the deadline dynamically
  based on field values. When set, the SLA uses relative duration mode and `duration`
  is restricted. Pass a sys_id string or a `Record()` reference.

- **relativeDurationWorksOn** (optional, default: `'Task record'`): `'Task record' | 'SLA record'`
  Which record the relative duration calculation reads field values from.
  Only relevant when `durationType` is set.

- **schedule** (optional): `string | Record<'cmn_schedule'>`
  Reference to a schedule record that defines business hours. The timer only counts
  time during scheduled hours. Required when `scheduleSource` is `'sla_definition'`
  (the default). Pass a sys_id string or a `Record()` reference.

- **scheduleSource** (optional, default: `'sla_definition'`): `'sla_definition' | 'task_field' | 'no_schedule'`
  Where the schedule comes from.
    - **sla_definition**: Uses the `schedule` property on this SLA definition. `schedule` is required.
    - **task_field**: Reads the schedule from a field on the task record. `scheduleSourceField` is required.
    - **no_schedule**: Timer runs on wall-clock time with no business-hours filtering.
      `schedule`, `timezoneSource`, `timezone`, and `scheduleSourceField` are restricted.

- **scheduleSourceField** (optional): `string`
  Dot-walked field path on the task record containing a schedule reference
  (e.g., `'cmdb_ci.schedule'`). Required when `scheduleSource` is `'task_field'`.

### Conditions

Conditions control the SLA timer lifecycle. Each condition is an encoded query string
that is evaluated against the task record on every update.

- **conditions** (optional): `object`
  Grouped conditions object for the SLA timer lifecycle.

  **Nested properties:**

  - **start** (optional): `string`
    Encoded query that starts the SLA timer when matched (e.g., `'priority=1'`).

  - **stop** (optional): `string`
    Encoded query that stops the timer and marks the SLA as achieved or breached
    (e.g., `'state=6'`).

  - **pause** (optional): `string`
    Encoded query that pauses the timer. Restricted when `durationType` is set
    (relative duration mode).

  - **resume** (optional): `string`
    Encoded query that resumes the timer after a pause. Restricted when
    `durationType` is set or `whenTo.resume` is `'no_match'`.

  - **reset** (optional): `string`
    Encoded query that resets the SLA timer. The `resetAction` property controls
    whether the SLA is cancelled or completed on reset.

  - **cancel** (optional): `string`
    Encoded query that cancels the SLA. Restricted when `whenTo.cancel` is not
    `'on_condition'`.

- **advancedConditionType** (optional, default: `'none'`): `'none' | 'advanced' | 'advanced_journal' | 'advanced_system' | 'advanced_journal_and_system'`
  Enables advanced scripted condition evaluation instead of simple encoded queries.

- **conditionType** (optional): `string | Record<'sla_condition_class'>`
  Reference to a task SLA condition class record for custom condition evaluation logic.

### Timer Behavior

- **resetAction** (optional, default: `'cancel'`): `'cancel' | 'complete'`
  What happens when the reset condition is met.
    - **cancel**: Cancels the current SLA instance and optionally restarts it.
    - **complete**: Marks the SLA as completed.

- **whenTo** (optional): `object`
  Controls when resume and cancel actions are evaluated.

  **Nested properties:**

  - **resume** (optional, default: `'on_condition'`): `'no_match' | 'on_condition'`
    When to resume the SLA after a pause.
      - **on_condition**: Resumes when the `conditions.resume` query matches.
      - **no_match**: Resumes when the `conditions.pause` query no longer matches.
        When set to `'no_match'`, `conditions.resume` is restricted.

  - **cancel** (optional, default: `'on_condition'`): `'no_match' | 'on_condition' | 'never'`
    When to cancel the SLA.
      - **on_condition**: Cancels when `conditions.cancel` matches.
      - **no_match**: Cancels when the start condition no longer matches.
      - **never**: The SLA can never be cancelled by conditions.
        When not `'on_condition'`, `conditions.cancel` is restricted.

### Retroactive Start

Controls whether an SLA timer can be backdated to an earlier time on the task record,
useful for SLAs that should have started counting before the start condition was met.

- **retroactive** (optional): `object`
  Retroactive behavior configuration.

  **Nested properties:**

  - **start** (optional, default: `false`): `boolean`
    Whether to retroactively set the SLA start time to a past timestamp.
    When `true`, `setStartTo` is required.

  - **setStartTo** (optional): `SetStartTo`
    The task field whose value becomes the retroactive start time.
    Required when `start` is `true`. Valid values:
      - `'sys_created_on'` -- Created date
      - `'opened_at'` -- Opened date
      - `'resolved_at'` -- Resolved date
      - `'closed_at'` -- Closed date
      - `'work_start'` -- Actual start
      - `'work_end'` -- Actual end
      - `'due_date'` -- Due date
      - `'expected_start'` -- Expected start
      - `'follow_up'` -- Follow up date
      - `'reopened_time'` -- Last reopened at
      - `'approval_set'` -- Approvals set date
      - `'sys_updated_on'` -- Last updated date

  - **pause** (optional, default: `true`): `boolean`
    Whether to retroactively apply pause conditions during the backdated period.
    Only applicable when `start` is `true`. Restricted when `durationType` is set
    (relative duration mode).

### Timezone

- **timezoneSource** (optional, default: `'task.caller_id.time_zone'`): `TimezoneSource`
  Where to get the timezone for SLA calculations. Valid values:
    - `'task.caller_id.time_zone'` -- The caller's timezone
    - `'task.caller_id.location.time_zone'` -- The caller's location timezone
    - `'task.cmdb_ci.location.time_zone'` -- The CI's location timezone
    - `'task.location.time_zone'` -- The task's location timezone
    - `'sla.timezone'` -- Use the `timezone` property on this SLA definition

- **timezone** (optional): `TimeZone`
  Explicit timezone for SLA calculations (e.g., `'US/Pacific'`, `'America/New_York'`).
  Only applicable when `timezoneSource` is `'sla.timezone'`. Restricted otherwise.

### References

- **overrides** (optional): `string | Record<'contract_sla'>`
  Reference to another SLA definition that this one overrides. Used when a more
  specific SLA should take precedence over a general one.

- **workflow** (optional): `string | Record<'wf_workflow'>`
  Reference to a legacy workflow to trigger when the SLA timer reaches milestones
  (e.g., 50% elapsed, 75% elapsed, breached). Pass a sys_id or `Record()` reference.

- **flow** (optional): `string | Record<'sys_hub_flow'>`
  Reference to a Flow Designer flow to trigger at SLA milestones.
  Preferred over `workflow` for new implementations.

- **vendor** (optional): `string | Record<'core_company'>`
  Reference to a vendor or company record. Relevant for underpinning contracts
  to track which external vendor is responsible.

### Logging

- **enableLogging** (optional, default: `false`): `boolean`
  Enables detailed debug logging for this SLA definition. Useful for troubleshooting
  why an SLA timer started, paused, or stopped unexpectedly. Disable in production
  to avoid log noise.


## Validation Rules

The SLA plugin enforces build-time validation where field requirements depend on
other field values:

**Duration type validations:**
- When `durationType` is empty (user-specified duration): `duration` is mandatory,
  and `schedule` is mandatory when `scheduleSource` is `'sla_definition'`.
  The `conditions.pause`, `conditions.resume`, and `whenTo.resume` fields are allowed.
- When `durationType` is a relative duration: `duration`, `conditions.pause`,
  `conditions.resume`, and `whenTo.resume` are restricted (warning). Existing values
  are preserved but cannot be modified.

**Schedule source validations:**
- When `scheduleSource` is `'no_schedule'`: `schedule`, `timezoneSource`, `timezone`,
  and `scheduleSourceField` are restricted (warning). The `schedule` field is
  automatically set to a default value.
- When `scheduleSource` is `'task_field'`: `schedule` and `duration` are restricted
  (warning), and `scheduleSourceField` is mandatory.
- When `scheduleSource` is `'sla_definition'` (default): `schedule` is mandatory.

**Retroactive start validations:**
- When `retroactive.start` is `false` or not set: `retroactive.setStartTo` and
  `retroactive.pause` are restricted (warning).
- When `retroactive.start` is `true`: `retroactive.setStartTo` is mandatory, and
  `retroactive.pause` is allowed.
- When `retroactive.start` is `true` AND `durationType` is a relative duration:
  `retroactive.pause` is restricted (warning).

**Condition field validations:**
- When `timezoneSource` is `'sla.timezone'`: the `timezone` field is allowed.
  Otherwise, it is restricted (warning).
- When `whenTo.resume` is `'no_match'`: `conditions.resume` is restricted (warning).
- When `whenTo.cancel` is not `'on_condition'`: `conditions.cancel` is restricted
  (warning).

**Duration format validation:**
- The `duration` property must use the `Duration()` helper function. Plain objects
  (e.g., `{ hours: 4 }`) produce a diagnostic error.


## Examples

### Basic SLA with Duration

Track resolution time for priority 1 incidents with a 4-hour deadline during
business hours.

```typescript
import { Sla } from '@servicenow/sdk/core'

export const P1IncidentResolution = Sla({
    $id: Now.ID['p1-incident-resolution'],
    name: 'Priority 1 Incident Resolution',
    table: 'incident',
    active: true,
    target: 'resolution',
    duration: Duration({ hours: 4 }),
    schedule: 'b1992362eb601100fcfb858ad106fe16',
    conditions: {
        start: 'priority=1',
        stop: 'state=6',
    },
    resetAction: 'cancel',
    whenTo: {
        resume: 'on_condition',
        cancel: 'on_condition',
    },
})
```

### SLA with Relative Duration and Schedule from Task

Use a relative duration record to compute the deadline dynamically, and read
the schedule from the task's CI.

```typescript
import { Sla } from '@servicenow/sdk/core'

export const DynamicDeadlineSla = Sla({
    $id: Now.ID['dynamic-deadline-sla'],
    name: 'Dynamic Deadline from CI Schedule',
    table: 'incident',
    active: true,
    type: 'OLA',
    durationType: 'a9e0c28d97710200e40ce648f053af56',
    relativeDurationWorksOn: 'Task record',
    scheduleSource: 'task_field',
    scheduleSourceField: 'cmdb_ci.schedule',
    timezoneSource: 'task.cmdb_ci.location.time_zone',
    conditions: {
        start: 'priority=2',
        stop: 'state=6',
    },
})
```

### SLA with Conditions and Retroactive Start

Create an SLA that retroactively starts from the record creation time, with
pause/resume conditions and a flow trigger.

```typescript
import { Sla } from '@servicenow/sdk/core'

export const RetroactiveSla = Sla({
    $id: Now.ID['retroactive-response-sla'],
    name: 'Retroactive Response SLA',
    table: 'incident',
    active: true,
    target: 'response',
    duration: Duration({ days: 1, hours: 8 }),
    schedule: 'b1992362eb601100fcfb858ad106fe16',
    timezoneSource: 'sla.timezone',
    timezone: 'US/Pacific',
    flow: '828f267973333300e289235f04f6a7a3',
    conditions: {
        start: 'priority=1^state=1',
        stop: 'comments!=NULL',
        pause: 'state=3',
        resume: 'state=2',
        cancel: 'state=7',
    },
    whenTo: {
        resume: 'on_condition',
        cancel: 'on_condition',
    },
    retroactive: {
        start: true,
        setStartTo: 'sys_created_on',
        pause: true,
    },
    enableLogging: true,
})
```

