# Function: Subflow(config, body)

Creates a reusable Subflow with typed inputs, outputs, and an optional body. Subflows are invoked from inside a Flow or another Subflow via `wfa.subflow()`.

## Parameters

### config

`SubflowDefinition<TInputs, TOutputs, TFlowVariables>`

Subflow configuration — name, inputs, outputs, variables, and execution settings.

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`

- **description** (optional): `string`

- **runAs** (optional): `'user' | 'system'`

- **runWithRoles** (optional): `string[]`

- **flowPriority** (optional): `'LOW' | 'MEDIUM' | 'HIGH'`

- **access** (optional): `'public' | 'package_private'`

- **category** (optional): `string`

- **inputs** (optional): `Record<string, Column>` — Input schema; passed by the caller via `wfa.subflow()`.

- **outputs** (optional): `Record<string, Column>` — Output schema; set inside body via `assignSubflowOutputs`.

- **flowVariables** (optional): `Record<string, Column>` — Internal variables scoped to this subflow execution.


### body (optional)

`(params: { inputs: TInputs, outputs: TOutputs, flowVariables: TFlowVariables }) => void`

The subflow body function. May contain `wfa.action()`, `wfa.flowLogic.*`, and nested `wfa.subflow()` calls. Body is optional — `Subflow(config)` with no body is valid for stub definitions.


## Column Types

Import from `@servicenow/sdk/core` for inputs, outputs, and flowVariables.

| Type | Description |
|------|-------------|
| `StringColumn` | Text values |
| `IntegerColumn` | Whole numbers |
| `BooleanColumn` | True/false values |
| `ReferenceColumn` | Reference to a ServiceNow table record |
| `DecimalColumn` | Decimal numbers (fixed precision) |
| `FloatColumn` | Floating-point numbers |
| `DateTimeColumn` | Date and time values |

Import from `@servicenow/sdk/automation` for complex types:

| Type | Description |
|------|-------------|
| `FlowObject` | Nested object with typed fields |
| `FlowArray` | Array of typed elements |


## Invoking a Subflow

Use `wfa.subflow()` inside a Flow or another Subflow to invoke a defined subflow.

```typescript
const result = wfa.subflow(
    mySubflow,
    { $id: Now.ID['instance_id'], annotation: 'optional description' },
    { inputField: wfa.dataPill(someValue, 'string'), waitForCompletion: true }
)
```

| Parameter | Description |
|-----------|-------------|
| `subflow` | The exported subflow constant to invoke. |
| `$id` | Unique identifier for this invocation instance. |
| `annotation` | Optional description for this invocation instance. |
| `inputs` | Input values matching the subflow's input schema. |
| `waitForCompletion` | If `true`, the calling flow waits for the subflow to complete before continuing. |

Access outputs via data pills: `wfa.dataPill(result.outputField, 'string')`.


## Setting Outputs

Use `wfa.flowLogic.assignSubflowOutputs()` inside the subflow body to return data to the caller.

```typescript
wfa.flowLogic.assignSubflowOutputs(
    { $id: Now.ID['assign_outputs'] },
    params.outputs,
    { success: true, record: wfa.dataPill(lookup.Record, 'reference') }
)
```


## Examples

### Subflow Definition

```typescript
import { Subflow, wfa, action } from '@servicenow/sdk/automation'
import { StringColumn, BooleanColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const validateUserSubflow = Subflow(
    {
        $id: Now.ID['validate_user_subflow'],
        name: 'Validate User Subflow',
        runAs: 'system',
        inputs: {
            userId: StringColumn({ label: 'User Sys ID', mandatory: true }),
        },
        outputs: {
            isValid: BooleanColumn({ label: 'Is Valid', mandatory: true }),
            userRecord: ReferenceColumn({ label: 'User Record', referenceTable: 'sys_user' }),
        },
    },
    (params) => {
        const lookup = wfa.action(
            action.core.lookUpRecord,
            { $id: Now.ID['lookup_user'] },
            {
                table: 'sys_user',
                conditions: `sys_id=${wfa.dataPill(params.inputs.userId, 'string')}`,
            }
        )

        wfa.flowLogic.if(
            {
                $id: Now.ID['check_user_found'],
                condition: `${wfa.dataPill(lookup.Record.sys_id, 'string')}ISNOTEMPTY`,
            },
            () => {
                wfa.flowLogic.assignSubflowOutputs(
                    { $id: Now.ID['assign_valid'] },
                    params.outputs,
                    { isValid: true, userRecord: wfa.dataPill(lookup.Record, 'reference') }
                )
            }
        )

        wfa.flowLogic.else({ $id: Now.ID['user_not_found'] }, () => {
            wfa.flowLogic.assignSubflowOutputs(
                { $id: Now.ID['assign_invalid'] },
                params.outputs,
                { isValid: false }
            )
        })
    }
)
```

### Invoking from a Flow

```typescript
import { Flow, wfa, trigger, action } from '@servicenow/sdk/automation'
import { validateUserSubflow } from './validate-user-subflow.now'

export const onboardUserFlow = Flow(
    {
        $id: Now.ID['onboard_user_flow'],
        name: 'Onboard User Flow',
        runAs: 'system',
    },
    wfa.trigger(
        trigger.record.created,
        { $id: Now.ID['trg_onboard'] },
        { table: 'sys_user', condition: 'active=true', run_flow_in: 'background' }
    ),
    (params) => {
        const validation = wfa.subflow(
            validateUserSubflow,
            { $id: Now.ID['validate_user_instance'] },
            {
                userId: wfa.dataPill(params.trigger.current.sys_id, 'string'),
                waitForCompletion: true,
            }
        )

        wfa.flowLogic.if(
            {
                $id: Now.ID['check_valid'],
                condition: `${wfa.dataPill(validation.isValid, 'boolean')}=true`,
            },
            () => {
                wfa.action(
                    action.core.log,
                    { $id: Now.ID['log_success'] },
                    { log_level: 'info', log_message: 'User validated — proceeding with onboarding' }
                )
            }
        )
    }
)
```

