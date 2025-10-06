#**Context:** Script Action API spec: Used to create a new Script Action (`sysevent_script_action`) in ServiceNow. Script Actions are server-side scripts that run in response to events.
```typescript
import { ScriptAction } from '@servicenow/sdk/core';

// Creates a new Script Action (`sysevent_script_action`)
ScriptAction({
    $id: '', // string | guid, mandatory. A unique identifier for the script action.
    name: '', // string, mandatory. The name of the script action.
    eventName: '', // string, mandatory. The name of the event that triggers this script action.
    script: '', // mandatory. A server-side script that runs when triggered by an event. This property supports a function from a JavaScript module, a reference to another file in the application that contains a script, or inline JavaScript. Format:- For functions, use the name of a function, function expression, or default function exported from a JavaScript module and import it into the .now.ts file. For information about JavaScript modules, see JavaScript modules and third-party libraries. - To use text content from another file, refer to a file in the application using the following format: Now.include('path/to/file'). - To provide an inline script, use string literals or template literals for multiple lines of code: 'Script' or `Script`.
    active: true, // boolean, optional. Whether the script action is active. Defaults to true.
    description: '', // string, optional. A description of what the script action does.
    order: 100, // number, optional. The order of execution for script actions on the same event. Lower numbers execute first. Defaults to 100.
    conditionScript: '', // string, optional. A server-side script that must evaluate to true for the script action to run. For example: "gs.hasRole('admin')"
});
```