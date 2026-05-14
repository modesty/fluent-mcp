# wfa

The `wfa` (Workflow Activity) namespace provides the core building blocks for defining Flows and Subflows. Use `wfa.trigger()` to start a flow, `wfa.action()` to execute built-in actions, and `wfa.flowLogic` for control flow (If/Else, ForEach, GoBackTo).

```typescript
import { wfa } from '@servicenow/sdk/automation'
```

## Members

| Member | Description |
|--------|-------------|
| `flowLogic` | Control flow operators for branching, looping, and flow control (`if`, `elseIf`, `else`, `forEach`, `waitForADuration`, `setFlowVariables`, `assignSubflowOutputs`, `endFlow`, `exitLoop`, `skipIteration`). |
| `action` | Execute a built-in action step and capture its typed outputs. Pass an action definition from the `action` built-ins. |
| `approvalDueDate` | Define a due-date policy for an `action.core.askForApproval` step. |
| `approvalRules` | Build a structured approval rules configuration for `action.core.askForApproval`. |
| `dataPill` | Create a typed data pill reference to a prior step's output or trigger data. |
| `inlineScript` | Define a server-side script inline as an action or subflow input. |
| `subflow` | Invoke a defined Subflow from inside a Flow or another Subflow. Pass an exported subflow constant and its inputs. |
| `actionStep` | Embed an OOB step inside a custom Action body. Pass a step definition from the `actionStep` built-ins. |
| `trigger` | Register the trigger that starts the flow. Pass a trigger definition from the `trigger` built-ins. |

## Examples

### Basic Flow

```typescript
import { Flow } from '@servicenow/sdk/core';
const { trigger, action, flowLogic } = wfa;

export default Flow(
    { $id: Now.ID['my-flow'], name: 'My Flow' },
    trigger(trigger.record.created, { table: 'incident' }),
    (params) => [
        action(action.core.log, { message: 'New incident created' }),
    ]
);
```

