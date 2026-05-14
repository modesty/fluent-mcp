
# Workflow Automation Custom Action Guide

Guide for creating reusable custom actions using the Fluent SDK. Custom actions encapsulate a sequence of OOB steps with typed inputs and outputs, and can be invoked from any Flow or Subflow via `wfa.action()`.

## When to Use

- Encapsulating a reusable sequence of OOB steps shared across multiple flows
- Standardizing common operations (e.g., incident escalation, user provisioning)
- Creating domain-specific action libraries for your application
- Reducing duplication when the same multi-step logic appears in several flows

**Important:** Custom actions contain only `wfa.actionStep()` calls — no flow logic (if/else, forEach), no triggers, and no nested custom actions.

---

## Core Principles

1. **Single Responsibility:** Each custom action should do one thing well. Use descriptive verb-phrase names (e.g., "Escalate Incident", "Provision User Account").

2. **OOB Steps Only:** The body contains only `wfa.actionStep()` calls. No `wfa.flowLogic.*`, no `wfa.action()`, no nested `Action()`.

3. **Sequential Execution:** Steps execute in order. Capture each step's return value to pass outputs to downstream steps via `wfa.dataPill()`.

4. **File Location:** Place custom actions in the `fluent/actions/` directory.

5. **Export Required:** Always export the action as `export const` so it can be imported by flows.

---

## Critical Syntax Requirements

**MANDATORY patterns -- violations cause runtime errors:**

1. **actionStep namespace**: Use `actionStep.createRecord` not `action.core.createRecord`. The `actionStep.*` namespace is for custom action bodies; `action.core.*` is for flows.

2. **TemplateValue**: Use `TemplateValue({ })` not `wfa.TemplateValue({ })`. It is available globally -- do not import it.

3. **Step output chaining**: Capture `wfa.actionStep()` return value as `const` to reference outputs in downstream steps.

4. **Step parameter prefixes**: Some steps use prefixed parameters (e.g., `create_record_table_name`, `create_record_field_values` for createRecord; `log_message`, `log_level` for log).

5. **Error handling**: Use `errorHandlingType: 'dont_stop_the_action'` to continue on error, or `'stop_the_action'` (default) to halt.

---

## Action Constructor

```typescript
import { Action, wfa, actionStep } from "@servicenow/sdk/automation";
import { StringColumn, BooleanColumn, ReferenceColumn } from "@servicenow/sdk/core";

export const myAction = Action(
  config,    // Action metadata, inputs, outputs
  body       // Sequential wfa.actionStep() calls
);
```

### Action Configuration Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | string | Yes | - | Unique identifier (`Now.ID['name']`) |
| `name` | string | Yes | - | Display name shown in Flow Designer |
| `description` | string | No | - | Action purpose and behavior |
| `category` | string | No | `"default"` | Grouping category |
| `access` | `'public'` \| `'private'` | No | `'public'` | Visibility scope |
| `inputs` | Record<string, Column> | No | `{}` | Input parameter definitions |
| `outputs` | Record<string, Column> | No | `{}` | Output parameter definitions |

### Column Types

Import from `@servicenow/sdk/core`:

| Type | Description | Example |
|------|-------------|---------|
| `StringColumn` | Text values | `StringColumn({ label: 'Name', mandatory: true })` |
| `IntegerColumn` | Whole numbers | `IntegerColumn({ label: 'Count' })` |
| `BooleanColumn` | True/false | `BooleanColumn({ label: 'Success' })` |
| `ReferenceColumn` | Table record reference | `ReferenceColumn({ label: 'User', referenceTable: 'sys_user' })` |
| `DecimalColumn` | Decimal numbers (fixed precision) | `DecimalColumn({ label: 'Amount' })` |
| `FloatColumn` | Floating-point numbers | `FloatColumn({ label: 'Score' })` |
| `DateTimeColumn` | Date and time | `DateTimeColumn({ label: 'Due Date' })` |

Import from `@servicenow/sdk/automation` for complex types:

| Type | Description |
|------|-------------|
| `FlowObject` | Nested object with typed fields |
| `FlowArray` | Array of typed elements |

---

## wfa.actionStep()

Embeds an OOB step inside a custom action body. Returns typed outputs for downstream steps.

```typescript
const result = wfa.actionStep(
  actionStep.<stepName>,
  { $id: Now.ID['step_id'], label: 'Step Label' },
  { /* step-specific parameters */ }
);
```

### Available OOB Steps

#### ServiceNow Data

| Step | Description |
|------|-------------|
| `actionStep.createRecord` | Creates a record. Params: `create_record_table_name`, `create_record_field_values` (TemplateValue). |
| `actionStep.updateRecord` | Updates a record. Params: `table`, `record`, `values` (TemplateValue). |
| `actionStep.deleteRecord` | Deletes a record. Params: `table`, `record`. |
| `actionStep.deleteMultipleRecords` | Deletes multiple records. Params: `table_name`, `conditions`. |
| `actionStep.lookUpRecord` | Looks up a single record. Params: `table_name`, `conditions`. |
| `actionStep.lookUpRecords` | Looks up multiple records. Params: `table_name`, `conditions`. |
| `actionStep.createOrUpdateRecord` | Upserts a record. Params: `table`, `fields` (TemplateValue). |
| `actionStep.createTask` | Creates a task with optional wait. Params: `create_record_table_name`, `create_record_field_values`, `wait`. |
| `actionStep.createRecordForRemoteTable` | Creates a record on a remote table. Params: `query_id`, `create_record_table_name`, `create_record_field_values`. |
| `actionStep.updateMultipleRecords` | Updates multiple records. Params: `table_name`, `conditions`, `field_values`. |
| `actionStep.fireEvent` | Fires a system event. Params: `event_name`, `record`, `table`, `parm1`, `parm2`. |
| `actionStep.waitForCondition` | Pauses until condition met. Params: `record`, `conditions`, `timeout_flag`, `timeout_duration`. |
| `actionStep.waitForEmailReply` | Pauses until email reply. Params: `record`, `enable_timeout`, `timeout_duration`. |
| `actionStep.waitForMessage` | Pauses until message received. Params: `message`, `enable_timeout`, `timeout`. |
| `actionStep.askForApproval` | Requests approval. Params: `table`, `record`, `approval_conditions`, `approval_reason`, `due_date`. |

#### Utilities

| Step | Description |
|------|-------------|
| `actionStep.log` | Logs a message. Params: `log_message`, `log_level` (`"info"`, `"warn"`, `"error"`). |
| `actionStep.email` | Sends an email. Params: `ah_to`, `ah_subject`, `ah_body`. |
| `actionStep.sms` | Sends an SMS. Params: `recipients`, `message`. |
| `actionStep.notification` | Sends a notification. Params: `notification`, `record`. |
| `actionStep.script` | Executes server-side script. |
| `actionStep.collectActivityContext` | Collects activity context data. |
| `actionStep.createAppFromPayload` | Creates an application from a payload. |
| `actionStep.getLatestResponseTextFromEmail` | Extracts latest reply from email thread. Params: `email_record`. |

---

## Anti-Patterns

### No Flow Logic Inside Actions

Custom actions are strictly sequential. Do not use `wfa.flowLogic.*` constructs.

```typescript
// WRONG - Flow logic in custom action
(params) => {
  wfa.flowLogic.if({ ... }, () => { ... });  // NOT allowed!
};

// CORRECT - Sequential steps only
(params) => {
  wfa.actionStep(actionStep.createRecord, { ... }, { ... });
  wfa.actionStep(actionStep.log, { ... }, { ... });
};
```

### No Nested Custom Actions

Custom actions cannot call other custom actions. Use only OOB steps from `actionStep.*`.

```typescript
// WRONG - Calling another custom action
(params) => {
  wfa.action(otherCustomAction, { ... }, { ... });  // NOT allowed!
};
```

### Data Pill Usage

Same rules as flows -- do not assign data pills to variables. Use directly in step parameters.

```typescript
// WRONG
const id = wfa.dataPill(params.inputs.recordId, 'string');
wfa.actionStep(actionStep.lookUpRecord, { ... }, { conditions: `sys_id=${id}` });

// CORRECT
wfa.actionStep(actionStep.lookUpRecord, { ... }, {
  conditions: `sys_id=${wfa.dataPill(params.inputs.recordId, 'string')}`
});
```

---

## Patterns

### Basic Custom Action

```typescript
import { Action, wfa, actionStep } from "@servicenow/sdk/automation";
import { StringColumn, BooleanColumn } from "@servicenow/sdk/core";

export const logAndCreate = Action(
  {
    $id: Now.ID["log_and_create"],
    name: "Log and Create Incident",
    description: "Logs a message and creates an incident",
    inputs: {
      description: StringColumn({ label: "Description", mandatory: true }),
      priority: StringColumn({ label: "Priority", mandatory: true }),
    },
    outputs: {
      success: BooleanColumn({ label: "Success" }),
    },
  },
  (params) => {
    wfa.actionStep(
      actionStep.log,
      { $id: Now.ID["log_start"], label: "Log start" },
      {
        log_message: `Creating incident: ${wfa.dataPill(params.inputs.description, "string")}`,
        log_level: "info",
      }
    );

    wfa.actionStep(
      actionStep.createRecord,
      { $id: Now.ID["create_incident"], label: "Create incident" },
      {
        create_record_table_name: "incident",
        create_record_field_values: TemplateValue({
          short_description: wfa.dataPill(params.inputs.description, "string"),
          priority: wfa.dataPill(params.inputs.priority, "string"),
        }),
      }
    );
  }
);
```

### Chaining Step Outputs

```typescript
import { Action, wfa, actionStep } from "@servicenow/sdk/automation";
import { ReferenceColumn, StringColumn } from "@servicenow/sdk/core";

export const createAndNotify = Action(
  {
    $id: Now.ID["create_and_notify"],
    name: "Create Record and Notify",
    inputs: {
      assignee: ReferenceColumn({ label: "Assignee", referenceTable: "sys_user", mandatory: true }),
      description: StringColumn({ label: "Description", mandatory: true }),
    },
    outputs: {},
  },
  (params) => {
    const created = wfa.actionStep(
      actionStep.createRecord,
      { $id: Now.ID["create_step"], label: "Create incident" },
      {
        create_record_table_name: "incident",
        create_record_field_values: TemplateValue({
          short_description: wfa.dataPill(params.inputs.description, "string"),
          assigned_to: wfa.dataPill(params.inputs.assignee, "reference"),
        }),
      }
    );

    wfa.actionStep(
      actionStep.log,
      { $id: Now.ID["log_result"], label: "Log result" },
      {
        log_message: wfa.dataPill(created.record.number, "string"),
        log_level: "info",
      }
    );
  }
);
```

### Using a Custom Action in a Flow

```typescript
import { Flow, wfa, trigger } from "@servicenow/sdk/automation";
import { logAndCreate } from "../actions/log-and-create.now";

Flow(
  {
    $id: Now.ID["auto_create_flow"],
    name: "Auto Create Incident from Email",
  },
  wfa.trigger(trigger.application.inboundEmail,
    { $id: Now.ID["email_trigger"] },
    { email_conditions: "subjectLIKEurgent" }
  ),
  params => {
    wfa.action(
      logAndCreate,
      { $id: Now.ID["invoke_action"] },
      {
        description: wfa.dataPill(params.trigger.subject, "string"),
        priority: "1",
      }
    );
  }
);
```

---

## Important Notes

- Custom actions must be placed in the `fluent/actions/` directory
- Always export as `export const` for use in flows
- Only `wfa.actionStep()` calls are allowed in the body -- no flow logic, no nested actions
- `TemplateValue` is available globally -- do not import
- Step outputs are captured by assigning `wfa.actionStep()` return value to a `const`
- Use `wfa.dataPill()` to pass action inputs or step outputs as dynamic values

