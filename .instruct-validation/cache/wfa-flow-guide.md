
# Workflow Automation Flow Guide

Comprehensive guide for creating and editing ServiceNow Workflow Automation (WFA) flows using the Fluent SDK. Covers Flow Designer flows including triggers, actions, flow logic, data pills, approvals, and service catalog integration. Use this when implementing event-driven automation, scheduled tasks, approval workflows, or any WFA component.

## When to Use

- Creating or editing workflow automation flows
- Implementing event-driven automation (record changes, emails, SLA events)
- Building scheduled/recurring automations
- Implementing approval workflows or notification processes
- When users mention triggers, actions, flow logic, or any WFA components

**Important:** Flows consist of four integrated components -- Flow Configuration (metadata), Trigger (when), Actions (what), and Flow Logic (how).

---

## Core Principles

1. **Minimal Implementation:** Build only what is explicitly requested. Do not add logging, error handling, notifications, approvals, or additional logic unless specified in requirements.

2. **Action-to-Verb Mapping:** Each action verb in requirements (create, update, send, notify, etc.) maps to exactly ONE action. Multiple verbs require multiple actions.

3. **Flow Logic Only When Explicit:** Use flow logic constructs (if, forEach, etc.) only when explicitly mentioned in requirements. Do not add conditional checks, default branches, or decision paths unless stated.

4. **Post-Creation Summary:** After successfully creating a flow, always note that the user needs to **activate the flow from Flow Designer** before it will execute. Flows are created in a draft state by default.

5. **Never Infer:** If you are unaware of any details, ask the user. If you are confident to do any action the user did not mention, take confirmation before including it.

---

## Critical Syntax Requirements

**MANDATORY patterns -- violations cause runtime errors:**

1. **TemplateValue**: Use `TemplateValue({ })` not `wfa.TemplateValue({ })`. It is available globally -- do not import it.

2. **Template literal wrapping**: Required for `recipients` in sendSms, `record` in deleteRecord within forEach.

3. **Email conditions**: Use `LIKE` not `CONTAINS` in inboundEmail `email_conditions`.

4. **Trigger data pill paths** (trigger-type specific):
   - **Record triggers** (created/updated): `_params.trigger.current.field` | record ref: `_params.trigger.current`
   - **Application triggers** (inboundEmail/slaTask/serviceCatalog): `_params.trigger.field` | record ref varies by trigger type

5. **Parameter names** (action-specific):
   - createRecord/updateRecord use `values:` | createTask/updateMultipleRecords use `field_values:`
   - lookUpRecords uses `table:`, `conditions:` | createTask uses `task_table:`

6. **Time functions**: `Time.addDays()`, `Time.nowDateTime()` do not exist. Use dataPills: `wfa.dataPill(_params.trigger.due_date, "glide_date_time")`

7. **Non-existent actions**: `deleteMultipleRecords` does not exist. Use: lookUpRecords followed by forEach with deleteRecord.

8. **JavaScript in conditions**: Flow logic conditions (if/elseIf/else) do NOT support JavaScript functions like `javascript:gs.daysAgoStart(30)`. Only use data pill comparisons with static values and encoded query operators. JavaScript functions work only in table action conditions (lookUpRecords, updateMultipleRecords).

---

## Critical Anti-Patterns

### Do NOT Assign Data Pills to Variables

WFA flows are declarative. Data pills MUST be used directly in action parameters.

```typescript
// WRONG - Assigning data pills to const
const recordId = wfa.dataPill(result.record, 'reference');
wfa.action(action.core.updateRecord, {...}, {
  record: recordId,  // WRONG!
});

// CORRECT - Use data pills directly
wfa.action(action.core.updateRecord, {...}, {
  record: wfa.dataPill(result.record, 'reference'),  // CORRECT!
});
```

### Template Literal Limitations

Template literals with data pills work ONLY in specific fields: `ah_subject`, `log_message`. They do NOT work in `ah_body`, `TemplateValue` fields, or `message` (SMS).

```typescript
// WRONG - Template literals in unsupported fields
ah_body: `Details: ${wfa.dataPill(desc, 'string')}`  // Does NOT work in ah_body!
values: TemplateValue({
  notes: `Status: ${wfa.dataPill(status, 'string')}`  // Does NOT work in TemplateValue!
});

// CORRECT - Static strings in unsupported fields, data pills directly in supported fields
ah_subject: `Incident ${wfa.dataPill(number, 'string')}`,  // Works in ah_subject
ah_body: 'Please check your assignment for details.'  // Static string
```

### Do NOT Mix JavaScript and DSL Paradigms

WFA flows are declarative configurations, not procedural code. Do not abstract, optimize, or make flows more "programmatic."

```typescript
// WRONG - JavaScript abstractions
const getFieldValue = field => wfa.dataPill(_params.trigger.current[field], "string");
const buildCondition = (field, value) => `${field}=${value}`;

// CORRECT - Direct, declarative specification
conditions: `priority=${wfa.dataPill(_params.trigger.current.priority, "string")}^active=true`;
```

### Other Avoidance Rules

- Do not add logging unless explicitly requested for debugging
- Do not hardcode sys_ids -- use `run_query` tool to fetch them

---

## Flow Constructor

```typescript
import { Flow, wfa, trigger, action } from "@servicenow/sdk/automation";

Flow(
  config,    // Flow configuration object
  trigger,   // Flow activation point
  callback   // Flow logic function
);
```

**Important:** Do NOT import `Time`, `Duration`, or `TemplateValue` from `@servicenow/sdk/core` -- they are available globally from `@servicenow/sdk/global`.

### Flow Configuration Properties

| Property     | Type                        | Required | Default    | Description                          |
| ------------ | --------------------------- | -------- | ---------- | ------------------------------------ |
| `$id`        | string                      | Yes      | -          | Unique identifier (`Now.ID['name']`) |
| `name`       | string                      | Yes      | -          | Display name shown in UI             |
| `description`| string                      | No       | -          | Flow purpose and behavior            |
| `runAs`      | `'system'` \| `'user'`      | No       | `'user'`   | Execution security context           |
| `runWithRoles`| string[]                   | No       | `[]`       | Required roles to execute flow       |
| `flowPriority`| `'LOW'` \| `'MEDIUM'` \| `'HIGH'` | No | `'MEDIUM'` | Execution priority                   |
| `protection` | `'read'` \| `''`            | No       | `''`       | Flow protection level                |

- Use `'system'` for `runAs` when automation must complete regardless of user permissions
- Use `'HIGH'` for `flowPriority` on time-sensitive, user-facing operations
- Use `'LOW'` for batch processing, cleanup tasks, non-urgent background operations

---

## Data Pills

`wfa.dataPill()` wraps expressions with type information for Flow Designer XML serialization.

```typescript
wfa.dataPill(_expression, _type: FlowDataType)
```

### Usage Contexts

- **Trigger data**: `_params.trigger.current.*` -- record fields from trigger
- **Action outputs**: `actionResult.fieldName` -- action output fields
- **Dot-walking**: `_params.trigger.current.assigned_to.manager.email` -- traverse reference fields

### Common FlowDataType Values

| Category | Types |
|----------|-------|
| **Basic** | `'string'`, `'integer'`, `'boolean'`, `'decimal'`, `'float'` |
| **Date/Time** | `'datetime'`, `'glide_date_time'`, `'glide_date'`, `'glide_duration'`, `'due_date'` |
| **Reference** | `'reference'`, `'table_name'`, `'document_id'` |
| **Array** | `'array.object'`, `'array.string'`, `'records'` |
| **Text** | `'string_full_utf8'`, `'html'`, `'journal_input'`, `'multi_line_text'` |
| **Choice/UI** | `'choice'`, `'currency'`, `'percent_complete'` |

### Data Pill Examples

```typescript
// Trigger record fields
wfa.dataPill(_params.trigger.current.short_description, "string");
wfa.dataPill(_params.trigger.current.priority, "integer");
wfa.dataPill(_params.trigger.current, "reference");

// Reference field dot-walking
wfa.dataPill(_params.trigger.current.assigned_to.email, "string");
wfa.dataPill(_params.trigger.current.assigned_to.manager.name, "string");

// Action outputs
wfa.dataPill(createResult.record, "reference");
wfa.dataPill(lookupResult.Records, "records");

// In conditions (template literal required)
condition: `${wfa.dataPill(_params.trigger.current.priority, "string")}=1`

// In template literals (only supported fields)
log_message: `Incident ${wfa.dataPill(_params.trigger.current.number, "string")} created`
```

---

## Triggers

### Temporal Requirements Analysis

| User Says | Trigger Type | Pattern |
|-----------|-------------|---------|
| "when created", "when updated", "when X happens" | Record Trigger | Event-driven, fires once per event |
| "while active", "monitor", "check regularly" | Scheduled Trigger | Time-driven, repeats periodically |
| "every day/hour/week", "periodically" | Scheduled Trigger | Time-driven, repeats at intervals |
| "at 9 AM", "on Monday", "first of month" | Scheduled Trigger | Time-driven, runs on schedule |

### Record Triggers

All record triggers share a common pattern:

```typescript
wfa.trigger(
  trigger.record.<triggerType>,
  { $id: Now.ID['trigger_id'] },
  {
    table: 'table_name',
    condition: 'encoded_query',
    run_flow_in: 'background',
    // ... other parameters
  }
)
```

#### trigger.record.created

Activates when a new record is created.

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `table` | string | - | Yes | Table to monitor |
| `condition` | string | - | No | Encoded query filter |
| `run_flow_in` | `'any'` \| `'background'` \| `'foreground'` | `'any'` | No | Execution context |
| `run_on_extended` | `'true'` \| `'false'` | `'false'` | No | Run on child tables |
| `run_when_setting` | `'both'` \| `'interactive'` \| `'non_interactive'` | `'both'` | No | Session type filter |

**Outputs:** `current` (reference), `table_name` (string), `run_start_date_time` (glide_date_time)

**Access:** `_params.trigger.current`, `_params.trigger.current.field_name`

#### trigger.record.updated

Activates when an existing record is updated. Has the same parameters as `created` plus:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `trigger_strategy` | `'once'` \| `'unique_changes'` \| `'every'` \| `'always'` | `'once'` | Controls when trigger fires |

- `'once'` -- fires only the first time condition matches
- `'unique_changes'` -- fires for each unique change to monitored fields
- `'every'` -- fires on every update regardless

**Additional output:** `changed_fields` (array.object) with `field_name`, `previous_value`, `current_value`.

#### trigger.record.createdOrUpdated

Activates on both create and update. Same parameters as `updated`. The `changed_fields` output is only populated on updates.

### Scheduled Triggers

#### trigger.scheduled.daily

```typescript
wfa.trigger(trigger.scheduled.daily, { $id: Now.ID['trigger'] }, {
  time: Time({ hours: 2, minutes: 0, seconds: 0 }, "UTC")
})
```

#### trigger.scheduled.weekly

```typescript
wfa.trigger(trigger.scheduled.weekly, { $id: Now.ID['trigger'] }, {
  day_of_week: 1,  // 1=Monday ... 7=Sunday
  time: Time({ hours: 9, minutes: 0, seconds: 0 }, "UTC")
})
```

#### trigger.scheduled.monthly

```typescript
wfa.trigger(trigger.scheduled.monthly, { $id: Now.ID['trigger'] }, {
  day_of_month: 1,  // 1-31 (last day if exceeds month)
  time: Time({ hours: 0, minutes: 0, seconds: 0 }, "UTC")
})
```

#### trigger.scheduled.repeat

```typescript
wfa.trigger(trigger.scheduled.repeat, { $id: Now.ID['trigger'] }, {
  repeat: Duration({ minutes: 15 })  // Also: hours, days, seconds
})
```

#### trigger.scheduled.runOnce

```typescript
wfa.trigger(trigger.scheduled.runOnce, { $id: Now.ID['trigger'] }, {
  run_in: "2026-03-15 02:00:00"  // ISO 8601 format
})
```

**Note:** Scheduled triggers do not have access to record data. Use actions to query data within the flow. `Time` and `Duration` are available globally -- do not import.

### Application Triggers

#### trigger.application.inboundEmail

Activates when an inbound email matches specified conditions.

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `email_conditions` | string | - | No | Encoded query to filter emails |
| `order` | integer | - | No | Priority order (lower = higher priority) |
| `stop_condition_evaluation` | boolean | true | No | Stop processing after first match |
| `target_table` | string | - | No | Table associated with reply record |

**Outputs:** `inbound_email` (reference), `subject` (string_full_utf8), `body_text` (string_full_utf8), `user` (reference), `from_address` (string_full_utf8), `target_record` (reference)

**Access:** `_params.trigger.subject`, `_params.trigger.body_text`, `_params.trigger.from_address`

#### trigger.application.slaTask

Activates when an SLA task event occurs. No input configuration parameters.

**Outputs:** `task_sla_record` (reference), `sla_flow_inputs` (object with `duration`, `name`, `is_repair`, `duration_type`)

**Access:** `_params.trigger.task_sla_record`, `_params.trigger.sla_flow_inputs.name`

#### trigger.application.serviceCatalog

Activates when a Service Catalog request item workflow needs processing.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `run_flow_in` | string | `"background"` | Execution context |

**Outputs:** `request_item` (reference to sc_req_item), `table_name` (string)

**Access:** `_params.trigger.request_item`, `_params.trigger.request_item.short_description`

#### trigger.application.knowledgeManagement

Activates on knowledge management events. No configuration parameters.

**Outputs:** `knowledge` (reference to kb_knowledge), `table_name` (string)

#### trigger.application.remoteTableQuery

Activates when a remote table query is executed.

| Parameter | Type | Description |
|-----------|------|-------------|
| `u_table` | string | Remote table name |

**Outputs:** `table_name` (string), `query_parameters` (object), `query_id` (string)

