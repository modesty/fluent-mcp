# Function: ScriptAction(options)

Script Actions are used to execute server-side scripts when specific events occur.
Configure a Script Action record to run custom scripts when a particular event is triggered.
Use a function exported from a JavaScript module (preferred) or `Now.include()` for legacy non-modular scripts. See the `module-guide` topic for details

## Parameters

### options

`ScriptAction`

An Object containing the properties of the Script Action

See https://www.servicenow.com/docs/csh?topicname=fluent-script-action-api.html&version=latest for more details

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **eventName** (required): `string`
  Event to use for this script action.
  If you do not find an event for your script action that suits your purpose, you can create a new one

- **name** (required): `string`
  Unique name for your Script Action

- **script** (required): `string | (args: any[]) => void`
  Script that runs when the condition you define evaluates to true.
  Two additional objects are available in this script:
  - `event`: a GlideRecord - the sysevent that caused this to be invoked.
  If you want this first parameter on the event, use `event.parm1` or `event.parm2` for the second parameter.
  For the date/time of the event, use `event.sys_created_on`.
  To get the user ID that created the event (if there was a user associated), use `event.user_id`.
  - `current`: a GlideRecord - the event scheduled on behalf of (incident for example).
  Use a function exported from a JavaScript module (preferred) or `Now.include()` for legacy non-modular scripts

- **$meta** (optional): `object`
  - **installMethod**: `'first install' | 'demo'`
    Map a record to an output folder that loads only in specific circumstances.
    'first install' - > 'unload',
    'demo' -> 'unload.demo'


- **active** (optional): `boolean`
  Enable or disable the Script Action. Defaults to false.

- **conditionScript** (optional): `string | (args: unknown[]) => void`
  Statement for a condition under which this script should execute.
  The system only parses the script field if the condition evaluates to true.
  If you decide to include the condition statement in the script, leave this field blank

- **description** (optional): `string`
  Documentation explaining the purpose and function of the Script Action

- **order** (optional): `number`
  Order in which the script will be executed



## Examples

### Script Action with Module

Create a script action that responds to events with a JavaScript module

```typescript
/**
 * @title Script Action with Module
 * @description Create a script action that responds to events with a JavaScript module
 */
import { ScriptAction } from '@servicenow/sdk/core'
import { handleSampleEvent } from '../../modules/script-actions/sample-action'

ScriptAction({
    $id: Now.ID['sample-script-action'],
    name: 'SampleScriptAction',
    active: true,
    description: 'Insert an incident',
    script: handleSampleEvent,
    eventName: 'sample.event',
    order: 100,
    conditionScript: "gs.hasRole('my_role')",
})

```

**modules/script-actions/sample-action.js**

```javascript
import { GlideRecord } from '@servicenow/glide'

export function handleSampleEvent() {
    var gr = new GlideRecord('incident')
    gr.initialize()
    gr.short_description = 'Created by Script Action'
    gr.insert()
}
```

### Conditional Script Action

Create a script action with a condition script that only runs for high priority incidents

```typescript
/**
 * @title Conditional Script Action
 * @description Create a script action with a condition script that only runs for high priority incidents
 */
import { ScriptAction } from '@servicenow/sdk/core'

ScriptAction({
    $id: Now.ID['conditional-script-action'],
    name: 'ConditionalScriptAction',
    active: true,
    description: 'Send notification only for high priority',
    eventName: 'incident.priority.high',
    order: 50,
    conditionScript: "event.parm1 == '1'",
    script: `(function executeScript() {
        var gr = new GlideRecord('sys_user');
        gr.get(event.parm2);
        gs.eventQueue('notify.user', gr, 'High priority incident assigned', '');
    })();`,
})

```

### Script Action with Inline Script

Create a script action that logs event details with inline JavaScript

```typescript
/**
 * @title Script Action with Inline Script
 * @description Create a script action that logs event details with inline JavaScript
 */
import { ScriptAction } from '@servicenow/sdk/core'

ScriptAction({
    $id: Now.ID['inline-script-action'],
    name: 'InlineScriptAction',
    active: true,
    description: 'Log event details',
    eventName: 'custom.log.event',
    order: 100,
    script: `(function executeScript() {
        gs.info('Event triggered: ' + event.name);
        gs.info('Event parm1: ' + event.parm1);
        gs.info('Event parm2: ' + event.parm2);
    })();`,
})

```

