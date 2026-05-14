
# Workflow Automation Subflow Guide

Guide for creating and invoking reusable Subflows using the Fluent SDK. Subflows encapsulate flow logic with typed inputs and outputs, and can be invoked from any Flow or another Subflow via `wfa.subflow()`.

## When to Use

- Same logic is needed across multiple flows
- Breaking a complex flow into composable, testable pieces
- A flow delegates a discrete unit of work that returns outputs
- Standardizing reusable logic (e.g., user validation, record enrichment)

**Flow vs Subflow:**

| | Flow | Subflow |
|---|------|---------|
| **Has trigger** | Yes (exactly one) | No |
| **Can be invoked** | No (event-driven only) | Yes, from flows or other subflows |
| **Has inputs/outputs** | No typed inputs/outputs | Yes, typed column-based |
| **File location** | `fluent/flows/` | `fluent/flows/` |

---

## Core Principles

1. **No Trigger:** Subflows do not have triggers. They are invoked explicitly via `wfa.subflow()`.

2. **Typed Inputs and Outputs:** Define inputs and outputs using column types (StringColumn, BooleanColumn, etc.) for type-safe invocation.

3. **Set Outputs Explicitly:** Use `wfa.flowLogic.assignSubflowOutputs()` inside the body to return data to the caller. This is the only way to set outputs.

4. **Export Required:** Always export the subflow as `export const` so it can be imported by flows.

5. **Body is Optional:** `Subflow(config)` with no body is valid for stub definitions or cross-file references.

6. **Full Flow Logic:** Unlike custom actions, subflows support all `wfa.flowLogic.*` constructs (if/else, forEach, exitLoop, etc.) and `wfa.action()` calls.

---

## Subflow Constructor

```typescript
import { Subflow, wfa, action } from "@servicenow/sdk/automation";
import { StringColumn, BooleanColumn } from "@servicenow/sdk/core";

export const mySubflow = Subflow(
  config,    // Subflow metadata, inputs, outputs, flowVariables
  body       // Optional function with flow logic
);
```

### Subflow Configuration Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | string | Yes | - | Unique identifier (`Now.ID['name']`) |
| `name` | string | Yes | - | Display name shown in Flow Designer |
| `description` | string | No | - | Subflow purpose and behavior |
| `runAs` | `'system'` \| `'user'` | No | `'user'` | Execution security context |
| `runWithRoles` | string[] | No | `[]` | Role sys_ids for elevated permissions |
| `flowPriority` | `'LOW'` \| `'MEDIUM'` \| `'HIGH'` | No | `'MEDIUM'` | Execution queue priority |
| `access` | `'public'` \| `'package_private'` | No | `'public'` | Visibility scope |
| `category` | string | No | - | Grouping category in Flow Designer |
| `inputs` | Record<string, Column> | No | `{}` | Input schema passed by the caller |
| `outputs` | Record<string, Column> | No | `{}` | Output schema set via `assignSubflowOutputs` |
| `flowVariables` | Record<string, Column> | No | `{}` | Internal variables scoped to this execution |

### Column Types

Import from `@servicenow/sdk/core`:

| Type | Description |
|------|-------------|
| `StringColumn` | Text values |
| `IntegerColumn` | Whole numbers |
| `BooleanColumn` | True/false values |
| `ReferenceColumn` | Reference to a table record (use `referenceTable` option) |
| `DecimalColumn` | Decimal numbers (fixed precision) |
| `FloatColumn` | Floating-point numbers |
| `DateTimeColumn` | Date and time values |

Import from `@servicenow/sdk/automation` for complex types:

| Type | Description |
|------|-------------|
| `FlowObject` | Nested object with typed fields |
| `FlowArray` | Array of typed elements |

---

## Invoking a Subflow

Use `wfa.subflow()` inside a Flow or another Subflow.

```typescript
import { mySubflow } from "./my-subflow.now";

const result = wfa.subflow(
  mySubflow,
  { $id: Now.ID["instance_id"], annotation: "Description" },
  {
    inputField: wfa.dataPill(someValue, "string"),
    waitForCompletion: true,
  }
);

// Access outputs via data pills
wfa.dataPill(result.outputField, "string");
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subflow` | Subflow | Yes | Exported subflow constant |
| `$id` | string | Yes | Unique identifier for this invocation |
| `annotation` | string | No | Description of this invocation |
| `inputs` | object | Yes | Input values matching subflow's input schema |
| `waitForCompletion` | boolean | No | If `true`, caller waits for subflow to finish (default `false`) |

**Important:** Set `waitForCompletion: true` when downstream logic depends on the subflow's outputs.

---

## Setting Outputs

Use `wfa.flowLogic.assignSubflowOutputs()` inside the subflow body. Always pass `params.outputs` as the second argument.

```typescript
wfa.flowLogic.assignSubflowOutputs(
  { $id: Now.ID["set_outputs"], annotation: "Return results" },
  params.outputs,
  { success: true, record: wfa.dataPill(lookup.Record, "reference") }
);
```

| Parameter | Description |
|-----------|-------------|
| First | Metadata with `$id` and optional `annotation` |
| Second | Always `params.outputs` -- do not construct a custom object |
| Third | Key/value pairs to assign; values can be literals or data pills |

---

## Anti-Patterns

### Do NOT Forget assignSubflowOutputs

If your subflow declares outputs, you must call `assignSubflowOutputs` in the body. Without it, the caller receives undefined values.

### Data Pill Rules Apply

Same rules as flows -- do not assign data pills to const variables in the subflow body. Use them directly in action parameters.

### Do NOT Add a Trigger

Subflows are invoked, not triggered. Adding trigger-like logic is incorrect.

---

## Patterns

### Basic Subflow

```typescript
import { Subflow, wfa, action } from "@servicenow/sdk/automation";
import { StringColumn, BooleanColumn } from "@servicenow/sdk/core";

export const checkRecordExists = Subflow(
  {
    $id: Now.ID["check_record_exists"],
    name: "Check Record Exists",
    runAs: "system",
    inputs: {
      table: StringColumn({ label: "Table Name", mandatory: true }),
      sysId: StringColumn({ label: "Record Sys ID", mandatory: true }),
    },
    outputs: {
      exists: BooleanColumn({ label: "Record Exists", mandatory: true }),
    },
  },
  (params) => {
    const lookup = wfa.action(
      action.core.lookUpRecord,
      { $id: Now.ID["lookup"] },
      {
        table: wfa.dataPill(params.inputs.table, "string"),
        conditions: `sys_id=${wfa.dataPill(params.inputs.sysId, "string")}`,
      }
    );

    wfa.flowLogic.if(
      {
        $id: Now.ID["found"],
        condition: `${wfa.dataPill(lookup.Record.sys_id, "string")}ISNOTEMPTY`,
      },
      () => {
        wfa.flowLogic.assignSubflowOutputs(
          { $id: Now.ID["set_true"] },
          params.outputs,
          { exists: true }
        );
      }
    );

    wfa.flowLogic.else({ $id: Now.ID["not_found"] }, () => {
      wfa.flowLogic.assignSubflowOutputs(
        { $id: Now.ID["set_false"] },
        params.outputs,
        { exists: false }
      );
    });
  }
);
```

### Invoking from a Flow

```typescript
import { Flow, wfa, trigger, action } from "@servicenow/sdk/automation";
import { checkRecordExists } from "./check-record-exists.now";

Flow(
  {
    $id: Now.ID["safe_update_flow"],
    name: "Safe Update Flow",
    runAs: "system",
  },
  wfa.trigger(trigger.record.updated, { $id: Now.ID["trigger"] }, {
    table: "incident",
    condition: "active=true",
    run_flow_in: "background",
    trigger_strategy: "unique_changes",
  }),
  params => {
    const check = wfa.subflow(
      checkRecordExists,
      { $id: Now.ID["check_instance"] },
      {
        table: "sys_user",
        sysId: wfa.dataPill(params.trigger.current.assigned_to, "string"),
        waitForCompletion: true,
      }
    );

    wfa.flowLogic.if(
      {
        $id: Now.ID["if_exists"],
        condition: `${wfa.dataPill(check.exists, "boolean")}=true`,
      },
      () => {
        wfa.action(action.core.log, { $id: Now.ID["log_ok"] }, {
          log_level: "info",
          log_message: "Assigned user verified -- proceeding with update",
        });
      }
    );
  }
);
```

### Minimal Subflow (No Body)

Valid for stub definitions or when the subflow is defined elsewhere.

```typescript
import { Subflow } from "@servicenow/sdk/automation";
import { StringColumn, BooleanColumn } from "@servicenow/sdk/core";

export const placeholderSubflow = Subflow({
  $id: Now.ID["placeholder"],
  name: "Placeholder Subflow",
  inputs: {
    recordId: StringColumn({ label: "Record ID", mandatory: true }),
  },
  outputs: {
    success: BooleanColumn({ label: "Success" }),
  },
});
```

---

## Important Notes

- Subflows are placed in the `fluent/flows/` directory (same as flows)
- Always export as `export const` for use in flows
- Subflows support full flow logic: `wfa.action()`, `wfa.flowLogic.*`, nested `wfa.subflow()`
- `assignSubflowOutputs` is the only way to set output values
- Set `waitForCompletion: true` when the caller needs subflow outputs before continuing
- `TemplateValue`, `Time`, and `Duration` are available globally -- do not import

