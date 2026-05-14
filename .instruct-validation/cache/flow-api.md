# Function: Flow(config, triggerInstance, body)

Creates a Flow record (`sys_hub_flow`) that defines a series of actions to execute when triggered.

## Parameters

### config

`FlowDefinition<Record<string, FlowValueType>>`

Flow configuration — name, description, priority, variables, and protection settings.

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`

- **description** (optional): `string`

- **flowPriority** (optional): `'LOW' | 'MEDIUM' | 'HIGH'`

- **flowVariables** (optional): `Record<string, FlowValueType>`

- **protection** (optional): `'' | 'read'`

- **runAs** (optional): `'user' | 'system'`

- **runWithRoles** (optional): `(string | Role)[]`


### triggerInstance

`undefined | ReturnType<TriggerInstance>`

The trigger that starts this flow, created by calling `wfa.trigger`.


### body (optional)

`(params: FlowBodyParams<ReturnType<TriggerInstance>, OutputsWithDotwalk<Record<string, FlowValueType>>>) => void`

The flow body function. Receives `params` containing `trigger` (the trigger outputs)
and `flowVariables` (any flow-level variables declared in `config`).

**Function Parameters:**

- **params**: `FlowBodyParams<F, OutputsWithDotwalk<V>>`
  - **flowVariables**: `Record<string, FlowValueType>`

  - **trigger**: `I`




## Examples

### Record Trigger Flow

Fires an event when an incident is created, demonstrating `trigger.record.created`, `wfa.action`, and `wfa.dataPill`.

```typescript
import { action, Flow, wfa, trigger } from '@servicenow/sdk/automation'

export const testFireEvent = Flow(
    {
        $id: Now.ID['test_fire_event_flow'],
        name: 'Test Fire Event',
        description: 'Tests the fireEvent core action',
    },
    wfa.trigger(
        trigger.record.created,
        { $id: Now.ID['test_fire_event_trigger'] },
        {
            table: 'incident',
            condition: 'active=true',
            run_flow_in: 'background',
        }
    ),
    (params) => {
        wfa.action(
            action.core.fireEvent,
            { $id: Now.ID['test_fire_event_action'] },
            {
                event_name: 'custom.incident.created',
                table: 'incident',
                record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
                parm1: 'Test parameter 1',
                parm2: 'Test parameter 2',
            }
        )

        wfa.action(
            action.core.log,
            { $id: Now.ID['test_fire_event_log'] },
            {
                log_level: 'info',
                log_message: 'no output',
            }
        )
    }
)
```

### Scheduled Trigger Flow

Sends an approval notification when a change request is approved, using `trigger.record.updated` and `wfa.dataPill` to reference trigger outputs.

```typescript
import { action, Flow, wfa, trigger } from '@servicenow/sdk/automation'

export const changeRequestApprovalNotificationFlow = Flow(
    {
        $id: Now.ID['change_request_approval_notification_flow'],
        name: 'Change Request Approval Notification Flow',
        description: 'Sends notification to requester when change request is approved',
    },
    wfa.trigger(
        trigger.record.updated,
        { $id: Now.ID['change_request_approved_trigger'] },
        {
            table: 'change_request',
            condition: 'approval=approved',
            run_flow_in: 'background',
            trigger_strategy: 'unique_changes',
        }
    ),
    (params) => {
        const requester = wfa.action(
            action.core.lookUpRecord,
            { $id: Now.ID['lookup_requester_details'] },
            {
                table: 'sys_user',
                conditions: `sys_id=${wfa.dataPill(params.trigger.current.requested_by, 'reference')}`,
                sort_type: 'sort_asc',
                if_multiple_records_are_found_action: 'use_first_record',
            }
        )

        wfa.action(
            action.core.sendEmail,
            { $id: Now.ID['send_approval_notification_email'] },
            {
                table_name: 'change_request',
                ah_subject: `Change Request ${wfa.dataPill(params.trigger.current.number, 'string')} - Approved`,
                ah_body: 'Your change request has been approved.',
                record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
                ah_to: wfa.dataPill(requester.Record.email, 'string'),
            }
        )
    }
)
```

### Service Catalog Trigger Flow

Demonstrates `trigger.application.serviceCatalog` with flow variables, `getCatalogVariables`, and conditional logic.

```typescript
import { Flow, wfa, action, trigger } from '@servicenow/sdk/automation'
import { CatalogItem, EmailVariable, SingleLineTextVariable, StringColumn } from '@servicenow/sdk/core'

const myCatalogItem = CatalogItem({
    $id: Now.ID['my_catalog_item'],
    flow: Now.ref('sys_hub_flow', 'my_catalog_flow'),
    name: 'My Catalog Item',
    shortDescription: 'Example catalog item',
    variables: {
        email: EmailVariable({ question: 'Email', order: 100 }),
        notes: SingleLineTextVariable({ question: 'Notes', order: 200 }),
    },
})

Flow(
    {
        $id: Now.ID['my_catalog_flow'],
        name: 'Service Catalog Flow',
        flowVariables: {
            approverUser: StringColumn({ label: 'Approver', mandatory: true }),
        },
    },
    wfa.trigger(
        trigger.application.serviceCatalog,
        { $id: Now.ID['my_catalog_trigger'] },
        { run_flow_in: 'background' }
    ),
    (params) => {
        const catVars = wfa.action(
            action.core.getCatalogVariables,
            { $id: Now.ID['get_cat_vars'] },
            {
                requested_item: `${wfa.dataPill(params.trigger.request_item, 'reference')}`,
                template_catalog_item: `${myCatalogItem}`,
                catalog_variables: [myCatalogItem.variables.email, myCatalogItem.variables.notes],
            }
        )

        wfa.action(
            action.core.log,
            { $id: Now.ID['log_cat_vars'] },
            {
                log_level: 'info',
                log_message: `Email: ${wfa.dataPill(catVars.email, 'email')}`,
            }
        )
    }
)
```

For comprehensive flow patterns including approval workflows, iterative processing, SLA escalation, inbound email handling, and complex flow logic, see the `wfa-flow-guide` and `wfa-flow-actions-guide` topics. `TemplateValue()` and `Duration()` are global helpers documented in the `data-helpers-guide` topic.

