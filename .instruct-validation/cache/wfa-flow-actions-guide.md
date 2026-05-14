
# Workflow Automation Flow Actions Guide

Action types, flow logic, and patterns for ServiceNow WFA flows. Covers record operations, communication actions, approvals, tasks, attachments, control flow, and complete flow patterns.

## Actions

### Table Actions

#### action.core.createRecord

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `table_name` | string | Yes | Target table |
| `values` | TemplateValue | Yes | Field values |

**Outputs:** `record` (reference), `table_name` (string)

```typescript
const incident = wfa.action(action.core.createRecord,
  { $id: Now.ID["create_incident"] },
  {
    table_name: "incident",
    values: TemplateValue({
      short_description: wfa.dataPill(_params.trigger.subject, "string"),
      priority: "1",
      caller_id: wfa.dataPill(_params.trigger.user, "reference")
    })
  }
);
```

#### action.core.updateRecord

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `table_name` | string | Yes | Target table |
| `record` | reference | Yes | Record sys_id to update |
| `values` | TemplateValue | Yes | Fields to update |

**Outputs:** `record` (reference), `table_name` (string)

```typescript
wfa.action(action.core.updateRecord,
  { $id: Now.ID["update"] },
  {
    table_name: "incident",
    record: wfa.dataPill(_params.trigger.current, "reference"),
    values: TemplateValue({
      assignment_group: wfa.dataPill(group.Record, "reference"),
      state: 2
    })
  }
);
```

#### action.core.deleteRecord

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `record` | reference | Yes | Record sys_id to delete |

No output fields. Inside forEach loops, wrap the record reference:

```typescript
wfa.action(action.core.deleteRecord, { $id: Now.ID["delete"] }, {
  record: `${wfa.dataPill(record, "reference")}`
});
```

#### action.core.lookUpRecord

Looks up a single record. Returns the first match.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `table` | string | Yes | Table to search |
| `conditions` | string | Yes | Encoded query |
| `sort_column` | string | No | Sort field |
| `sort_type` | choice | No | `'sort_asc'` or `'sort_desc'` |

**Outputs:** `Record` (reference, **uppercase**), `status` (choice: `'0'`=success, `'1'`=error), `error_message` (string)

#### action.core.lookUpRecords

Looks up multiple records. Returns array and count.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `table` | string | Yes | Table to search |
| `conditions` | string | Yes | Encoded query |
| `max_results` | integer | No | Max records (default 1000) |

**Outputs:** `Records` (array, **uppercase**), `Count` (integer, **uppercase**)

```typescript
const results = wfa.action(action.core.lookUpRecords,
  { $id: Now.ID["find"] },
  { table: "incident", conditions: "active=true^priority=1", max_results: 50 }
);

wfa.flowLogic.forEach(
  wfa.dataPill(results.Records, "array.object"),
  { $id: Now.ID["loop"] },
  (item) => { /* process each */ }
);
```

**Important:** `lookUpRecord` and `lookUpRecords` output field names are **uppercase** (`Record`, `Records`, `Count`) unlike other actions.

#### action.core.updateMultipleRecords

Bulk updates all matching records.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `table_name` | string | Yes | Target table |
| `conditions` | string | Yes | Encoded query filter |
| `field_values` | TemplateValue | Yes | Fields to update (note: `field_values`, not `values`) |

**Outputs:** `count` (integer), `status` (choice)

#### action.core.createOrUpdateRecord

Upserts based on unique fields defined in the table dictionary.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `table_name` | string | Yes | Target table |
| `fields` | TemplateValue | Yes | Fields including unique identifiers |

**Outputs:** `record` (reference), `status` (choice: `'created'`, `'updated'`, `'error'`)

### Communication Actions

#### action.core.sendEmail

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `ah_to` | string | Yes | Comma-separated recipients |
| `ah_subject` | string | Yes | Subject line (supports data pills) |
| `ah_body` | html | No | Body (**static strings only** -- data pills NOT supported) |
| `record` | reference | No | Related record for tracking |
| `table_name` | string | No | Table of related record |
| `ah_cc` | string | No | CC recipients |
| `ah_bcc` | string | No | BCC recipients |

**Outputs:** `email` (reference to sys_email)

**Important:** `ah_body` only accepts static strings. For dynamic email content, use `action.core.sendNotification` with a notification template.

#### action.core.sendNotification

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `notification` | reference | Yes | Notification template (sys_id or name) |
| `record` | reference | No | Associated record |
| `table_name` | string | No | Table of associated record |

No output fields.

#### action.core.sendSms

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `recipients` | string | Yes | Phone number (E.164 format recommended) |
| `message` | string | Yes | SMS content (plain text) |

**Important:** `recipients` must use template literal wrapping when using data pills:
```typescript
recipients: `${wfa.dataPill(user.phone, "string")}`
```

#### action.core.associateRecordToEmail

Associates a record with a sys_email record (updates the Target field).

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `target_record` | reference | Yes | Record to associate |
| `email_record` | reference | Yes | Email record from sys_email |

#### action.core.getEmailHeader

Retrieves a specific email header value.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `target_header` | string | Yes | Header name (case-insensitive) |
| `email_record` | reference | Yes | sys_email record |

**Outputs:** `header_value` (string)

#### action.core.getLatestResponseTextFromEmail

Extracts the latest reply text from an email thread, stripping quoted prior messages.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `email_record` | reference | Yes | sys_email record |

**Outputs:** `latest_response_text` (string)

### Control Actions

#### action.core.log

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `log_level` | string | Yes | `"info"`, `"warn"`, or `"error"` |
| `log_message` | string | Yes | Message (max 255 chars, supports data pills in template literals) |

#### action.core.fireEvent

Fires a registered ServiceNow system event.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `event_name` | reference | Yes | Event name string (e.g., `'incident.assigned'`) |
| `record` | reference | Yes | Associated record (template literal wrapping required) |
| `table` | string | No | Table name |
| `parm1` | string | No | First parameter (template literal wrapping required) |
| `parm2` | string | No | Second parameter |

No output fields. Fire-and-forget -- event handlers run asynchronously.

#### action.core.waitForCondition

Pauses flow until a record matches a condition. Supports optional timeout.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `record` | reference | Yes | Record to monitor (template literal wrapping required) |
| `conditions` | string | Yes | Encoded query condition |
| `table_name` | string | No | Table name |
| `timeout_flag` | boolean | No | Enable timeout |
| `timeout_duration` | Duration | No | How long to wait |
| `timeout_schedule` | reference | No | Business hours schedule (cmn_schedule) |

**Outputs:** `state` (choice: `'0'`=condition met, `'1'`=timeout)

#### action.core.waitForEmailReply

Pauses flow until a reply arrives on a sent email.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `record` | reference | Yes | Outgoing sys_email record from sendEmail output |
| `enable_timeout` | boolean | No | Enable timeout |
| `timeout_duration` | Duration | No | How long to wait |

**Outputs:** `state` (choice: `'0'`=reply received, `'1'`=timeout), `email_reply` (reference, empty on timeout)

#### action.core.waitForMessage

Pauses flow until an external message is received via the Flow API.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Exact message string that resumes flow (case-sensitive) |
| `enable_timeout` | boolean | No | Enable timeout |
| `timeout` | Duration | No | Duration to wait (note: `timeout`, not `timeout_duration`) |

**Outputs:** `payload` (string, empty on timeout)

### Approval Actions

#### action.core.askForApproval

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `record` | reference | Yes | Record requiring approval |
| `table` | string | No | Table name |
| `approval_conditions` | object | Yes | Approval rules (use `wfa.approvalRules()`) |
| `approval_reason` | string | No | Reason for approval (max 160 chars) |
| `approval_field` | string | No | Field to store approval state |
| `journal_field` | string | No | Field to store approval history |
| `due_date` | datetime | No | Due date (use `wfa.approvalDueDate()`) |

**Outputs:** `approval_state` (choice: `approved`, `rejected`, `requested`, `not_required`, `cancelled`)

#### wfa.approvalRules()

```typescript
wfa.approvalRules({
  conditionType: "OR",
  ruleSets: [{
    action: "Approves",           // 'Approves' | 'Rejects' | 'ApprovesRejects'
    conditionType: "AND",
    rules: [[{
      ruleType: "Any",            // 'Any' | 'All' | 'Count' | 'Percent'
      users: ["user_sys_id"],
      groups: [],
      manual: false
    }]]
  }]
})
```

**ruleType values:**
- `'Any'` -- approved when ANY single approver approves
- `'All'` -- approved when ALL approvers approve
- `'Count'` -- specific number of approvals required (set `count`)
- `'Percent'` -- percentage of approvals required (set `percent`)

#### wfa.approvalDueDate()

```typescript
wfa.approvalDueDate({
  action: "reject",          // 'none' | 'approve' | 'reject' | 'cancel'
  dateType: "actual",        // 'actual' | 'relative'
  date: "{}",                // '{}' for actual, datapill for relative
  duration: 5,
  durationType: "days",      // 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes'
  daysSchedule: ""           // Schedule sys_id for business hours, '' for calendar days
})
```

### Task Actions

#### action.core.createTask

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `task_table` | string | Yes | Task table name (task, sc_task, change_task, etc.) |
| `field_values` | TemplateValue | No | Field values (note: `field_values`, not `values`) |
| `wait` | boolean | No | Wait for task completion (default false) |

**Outputs:** `Record` (reference, **uppercase**), `Table` (string)

Common task tables: `task`, `sc_task`, `sysapproval_approver`, `change_task`, `incident_task`, `problem_task`

### Service Catalog Actions

#### action.core.submitCatalogItemRequest

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `catalog_item` | reference | Yes | sys_id of catalog item |
| `catalog_item_inputs` | string | No | Variables in `^`-delimited format |
| `sysparm_quantity` | integer | No | Quantity (default 1) |
| `sysparm_requested_for` | reference | No | User to request for |

**Outputs:** `requested_item` (reference to sc_req_item), `status` (choice: 0=success, 1=error, 2=timeout)

#### action.core.getCatalogVariables

Retrieves variable values from a catalog request item. Used with `trigger.application.serviceCatalog`.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `requested_item` | reference | Yes | Request item reference |
| `template_catalog_item` | string | Yes | Catalog item reference as template literal |
| `catalog_variables` | array | Yes | Array of variable references |

**Outputs:** Named by variable name (e.g., `catalogVars.memory`, `catalogVars.storage`)

#### action.core.createCatalogTask

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `ah_requested_item` | reference | Yes | Request item reference |
| `ah_short_description` | string | Yes | Task description |
| `ah_fields` | TemplateValue | No | Additional field values |

### SLA Actions

#### action.core.slaPercentageTimer

Pauses flow until a specified percentage of SLA time has elapsed.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `percentage` | integer | Yes | SLA percentage to wait for (0-100) |

**Outputs:** `status` (choice: completed, paused, repair, skipped, cancelled), `scheduled_end_date_time` (datetime)

### Attachment Actions

All attachment actions follow the same `wfa.action(action.core.<name>, { $id }, { ... })` pattern.

| Action | Key Inputs | Key Outputs | Use Case |
|--------|-----------|-------------|----------|
| `getAttachmentsOnRecord` | `source_record` (template literal) | `parameter` (records list), `parameter1` (count) | List attachments |
| `copyAttachment` | `source_record`, `target_record` | `sys_attachment` (reference) | Copy attachment (original preserved) |
| `moveAttachment` | `source_record`, `target_record` | `sys_attachment` (reference) | Move attachment (removed from source) |
| `deleteAttachment` | `source_record` | none | Delete attachment(s) |
| `lookupAttachment` | `source_record`, `file_name` | `sys_id`, `file_names` | Find attachment by name |
| `lookUpEmailAttachments` | `email_record` | `parameter` (records), `parameter1` (count) | Get email attachments |
| `moveEmailAttachmentsToRecord` | `email_record`, `target_record` | none | Move all email attachments |

**Important:** `source_record` and `target_record` inputs require template literal wrapping:
```typescript
source_record: `${wfa.dataPill(_params.trigger.current, "reference")}`
```

---

## Flow Logic

### Conditional: if / elseIf / else

```typescript
wfa.flowLogic.if(
  {
    $id: Now.ID["check"],
    condition: `${wfa.dataPill(_params.trigger.current.priority, "string")}=1`
  },
  () => { /* actions for priority 1 */ }
);

wfa.flowLogic.elseIf(
  {
    $id: Now.ID["check_p2"],
    condition: `${wfa.dataPill(_params.trigger.current.priority, "string")}=2`
  },
  () => { /* actions for priority 2 */ }
);

wfa.flowLogic.else(
  { $id: Now.ID["default"] },
  () => { /* default actions */ }
);
```

### Loops: forEach

```typescript
wfa.flowLogic.forEach(
  wfa.dataPill(results.Records, "array.object"),
  { $id: Now.ID["loop"], annotation: "Process each record" },
  (item) => {
    // Use wfa.dataPill(item.field, "type") to access fields
  }
);
```

### Loop Control: exitLoop / skipIteration

```typescript
// Exit loop early (break)
wfa.flowLogic.exitLoop({ $id: Now.ID["exit"] });

// Skip current iteration (continue)
wfa.flowLogic.skipIteration({ $id: Now.ID["skip"] });
```

### Flow Termination: endFlow

```typescript
wfa.flowLogic.endFlow({ $id: Now.ID["end"] });
```

### Condition Syntax Reference

| Operator | Example | Description |
|----------|---------|-------------|
| `=` | `priority=1` | Equals |
| `!=` | `state!=6` | Not equals |
| `<`, `<=`, `>`, `>=` | `priority<=2` | Comparison |
| `ISEMPTY` | `assigned_toISEMPTY` | Field is empty |
| `ISNOTEMPTY` | `assignment_groupISNOTEMPTY` | Field has value |
| `IN` | `stateIN1,2,3` | In list |
| `STARTSWITH` | `numberSTARTSWITHINC` | Starts with |
| `CONTAINS` | `short_descriptionCONTAINSfailed` | Contains |
| `^` | `priority=1^active=true` | AND |
| `^OR` | `priority=1^ORpriority=2` | OR |

---

## Flow Patterns

### Simple Automation

**Structure:** Trigger followed by Single Action

```typescript
import { Flow, wfa, trigger, action } from "@servicenow/sdk/automation";

Flow(
  {
    $id: Now.ID["auto_assign_high_priority"],
    name: "Auto-Assign High Priority",
    description: "Assigns critical incidents to on-call engineer"
  },
  wfa.trigger(trigger.record.created, { $id: Now.ID["incident_created"] }, {
    table: "incident",
    condition: "priority<=2^active=true",
    run_flow_in: "background"
  }),
  _params => {
    wfa.action(action.core.updateRecord, { $id: Now.ID["assign"] }, {
      table_name: "incident",
      record: wfa.dataPill(_params.trigger.current, "reference"),
      values: TemplateValue({
        assigned_to: "<oncall_engineer_sys_id>",
        assignment_group: "<it_support_group_sys_id>",
        state: 2
      })
    });
  }
);
```

### Conditional Routing

**Structure:** Trigger followed by if/elseIf/else with different actions per branch

```typescript
import { Flow, wfa, trigger, action } from "@servicenow/sdk/automation";

Flow(
  {
    $id: Now.ID["priority_routing"],
    name: "Priority-Based Routing",
    description: "Routes incidents to teams based on priority"
  },
  wfa.trigger(trigger.record.created, { $id: Now.ID["trigger"] }, {
    table: "incident", condition: "active=true", run_flow_in: "background"
  }),
  _params => {
    wfa.flowLogic.if(
      { $id: Now.ID["check_p1"],
        condition: `${wfa.dataPill(_params.trigger.current.priority, "string")}=1` },
      () => {
        wfa.action(action.core.updateRecord, { $id: Now.ID["assign_p1"] }, {
          table_name: "incident",
          record: wfa.dataPill(_params.trigger.current, "reference"),
          values: TemplateValue({ assignment_group: "<senior_team_sys_id>", state: 2 })
        });
        wfa.action(action.core.sendEmail, { $id: Now.ID["notify_p1"] }, {
          ah_to: "senior-team@company.com",
          ah_subject: `CRITICAL: ${wfa.dataPill(_params.trigger.current.number, "string")}`,
          ah_body: "Critical incident requires immediate attention."
        });
      }
    );
    wfa.flowLogic.elseIf(
      { $id: Now.ID["check_p2"],
        condition: `${wfa.dataPill(_params.trigger.current.priority, "string")}=2` },
      () => {
        wfa.action(action.core.updateRecord, { $id: Now.ID["assign_p2"] }, {
          table_name: "incident",
          record: wfa.dataPill(_params.trigger.current, "reference"),
          values: TemplateValue({ assignment_group: "<regular_team_sys_id>", state: 2 })
        });
      }
    );
    wfa.flowLogic.else({ $id: Now.ID["default"] }, () => {
      wfa.action(action.core.updateRecord, { $id: Now.ID["assign_general"] }, {
        table_name: "incident",
        record: wfa.dataPill(_params.trigger.current, "reference"),
        values: TemplateValue({ assignment_group: "<general_queue_sys_id>" })
      });
    });
  }
);
```

### Record Iteration

**Structure:** Trigger followed by lookUpRecords followed by forEach with action per record

```typescript
import { Flow, wfa, trigger, action } from "@servicenow/sdk/automation";

Flow(
  {
    $id: Now.ID["bulk_assign"],
    name: "Bulk Assign Unassigned Incidents"
  },
  wfa.trigger(trigger.scheduled.daily, { $id: Now.ID["trigger"] }, {
    time: Time({ hours: 8, minutes: 0, seconds: 0 }, "UTC")
  }),
  _params => {
    const incidents = wfa.action(action.core.lookUpRecords,
      { $id: Now.ID["find"] },
      { table: "incident", conditions: "active=true^assigned_toISEMPTY^priority<=2", max_results: 50 }
    );

    wfa.flowLogic.if(
      { $id: Now.ID["check"], condition: `${wfa.dataPill(incidents.Count, "integer")}>0` },
      () => {
        wfa.flowLogic.forEach(
          wfa.dataPill(incidents.Records, "array.object"),
          { $id: Now.ID["loop"] },
          (incident) => {
            wfa.action(action.core.updateRecord, { $id: Now.ID["assign"] }, {
              table_name: "incident",
              record: wfa.dataPill(incident, "reference"),
              values: TemplateValue({ assignment_group: "<support_group_sys_id>" })
            });
          }
        );
      }
    );
  }
);
```

### Approval Workflow

**Structure:** Trigger followed by askForApproval followed by route by approval result

```typescript
import { Flow, wfa, trigger, action } from "@servicenow/sdk/automation";

Flow(
  {
    $id: Now.ID["change_approval"],
    name: "Change Request Approval Workflow"
  },
  wfa.trigger(trigger.record.created, { $id: Now.ID["trigger"] }, {
    table: "change_request", condition: "type=normal"
  }),
  _params => {
    const approval = wfa.action(action.core.askForApproval,
      { $id: Now.ID["cab_approval"] },
      {
        record: wfa.dataPill(_params.trigger.current, "reference"),
        table: "change_request",
        approval_reason: "CAB approval required",
        approval_conditions: wfa.approvalRules({
          conditionType: "OR",
          ruleSets: [{
            action: "ApprovesRejects",
            conditionType: "AND",
            rules: [[{
              ruleType: "Percent", percent: 50,
              users: [], groups: ["<cab_group_sys_id>"], manual: false
            }]]
          }]
        }),
        due_date: wfa.approvalDueDate({
          action: "reject", dateType: "actual", date: "{}",
          duration: 5, durationType: "days", daysSchedule: ""
        })
      }
    );

    wfa.flowLogic.if(
      { $id: Now.ID["approved"],
        condition: `${wfa.dataPill(approval.approval_state, "choice")}=approved` },
      () => {
        wfa.action(action.core.updateRecord, { $id: Now.ID["approve"] }, {
          table_name: "change_request",
          record: wfa.dataPill(_params.trigger.current, "reference"),
          values: TemplateValue({ state: 3, comments: "CAB approved" })
        });
      }
    );
    wfa.flowLogic.elseIf(
      { $id: Now.ID["rejected"],
        condition: `${wfa.dataPill(approval.approval_state, "choice")}=rejected` },
      () => {
        wfa.action(action.core.updateRecord, { $id: Now.ID["reject"] }, {
          table_name: "change_request",
          record: wfa.dataPill(_params.trigger.current, "reference"),
          values: TemplateValue({ state: 4, comments: "CAB rejected" })
        });
      }
    );
  }
);
```

### Monitoring Pattern

**Structure:** Scheduled Trigger followed by lookUpRecords followed by forEach with action per record

Use when requirements include "while", "monitor", "periodically", "every day/hour", or ongoing checks. Differs from record iteration by using a scheduled trigger instead of an event trigger.

```typescript
import { Flow, wfa, trigger, action } from "@servicenow/sdk/automation";

Flow(
  {
    $id: Now.ID["health_check"],
    name: "Health Check Every 15 Minutes"
  },
  wfa.trigger(trigger.scheduled.repeat, { $id: Now.ID["trigger"] }, {
    repeat: Duration({ minutes: 15 })
  }),
  _params => {
    const unassigned = wfa.action(action.core.lookUpRecords,
      { $id: Now.ID["check"] },
      { table: "incident", conditions: "assigned_toISEMPTY^priority=1^active=true", max_results: 100 }
    );

    wfa.flowLogic.if(
      { $id: Now.ID["threshold"],
        condition: `${wfa.dataPill(unassigned.Count, "integer")}>10` },
      () => {
        wfa.action(action.core.sendEmail, { $id: Now.ID["alert"] }, {
          ah_to: "admin@company.com",
          ah_subject: "Alert: High number of unassigned P1 incidents",
          ah_body: "There are more than 10 unassigned P1 incidents. Please investigate."
        });
      }
    );
  }
);
```

### Service Catalog Fulfillment

**Structure:** serviceCatalog trigger followed by getCatalogVariables followed by conditional routing and createCatalogTask

Use `trigger.application.serviceCatalog` when automating service catalog request fulfillment. It provides direct access to request item context.

```typescript
import { Flow, wfa, trigger, action } from "@servicenow/sdk/automation";

Flow(
  {
    $id: Now.ID["laptop_fulfillment"],
    name: "Laptop Fulfillment Workflow"
  },
  wfa.trigger(trigger.application.serviceCatalog,
    { $id: Now.ID["catalog_trigger"] },
    { run_flow_in: "background" }
  ),
  _params => {
    wfa.action(action.core.createCatalogTask, { $id: Now.ID["create_task"] }, {
      ah_requested_item: wfa.dataPill(_params.trigger.request_item, "reference"),
      ah_short_description: "Fulfill laptop request",
      ah_fields: TemplateValue({
        assignment_group: "Hardware Fulfillment Team",
        priority: "3"
      })
    });
  }
);
```

---

## Complete Flow Example

A full example combining configuration, trigger, actions, conditions, and data pills:

```typescript
import { Flow, wfa, trigger, action } from "@servicenow/sdk/automation";

Flow(
  // 1. Configuration
  {
    $id: Now.ID["escalate_high_priority"],
    name: "Escalate High Priority Incidents",
    description: "Escalates P1 incidents to senior team with notification",
    runAs: "system",
    flowPriority: "HIGH"
  },

  // 2. Trigger
  wfa.trigger(trigger.record.created,
    { $id: Now.ID["incident_created"] },
    {
      table: "incident",
      condition: "priority=1^active=true",
      run_flow_in: "background"
    }
  ),

  // 3. Flow Logic
  _params => {
    // Update record
    wfa.action(action.core.updateRecord, { $id: Now.ID["assign"] }, {
      table_name: "incident",
      record: wfa.dataPill(_params.trigger.current, "reference"),
      values: TemplateValue({
        assignment_group: "<senior_team_sys_id>",
        state: 2
      })
    });

    // Send notification
    wfa.action(action.core.sendEmail, { $id: Now.ID["notify"] }, {
      ah_to: "senior-team@company.com",
      ah_subject: `Critical: ${wfa.dataPill(_params.trigger.current.number, "string")}`,
      ah_body: "A critical incident requires immediate attention."
    });

    // Log action
    wfa.action(action.core.log, { $id: Now.ID["log"] }, {
      log_level: "info",
      log_message: `Escalated incident ${wfa.dataPill(_params.trigger.current.number, "string")}`
    });
  }
);
```

---

## Important Notes

- All flows must be created under the `fluent/flows` folder
- Every flow requires exactly one trigger
- Background execution (`run_flow_in: 'background'`) is recommended for most flows
- `TemplateValue`, `Time`, and `Duration` are available globally -- do not import
- In conditions, always use template literals: `` `${wfa.dataPill(...)}=value` ``
- Conditions use encoded query format: use `=` not `==`, `^` for AND, `^OR` for OR

