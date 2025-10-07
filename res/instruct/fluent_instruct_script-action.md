# Instructions for Fluent Script Action API
Always reference the Script Action API specifications for more details.
1. Use the `ScriptAction` API to define a server-side script that executes when a specific event is triggered.
2. The `eventName` property must match the name of a registered event in the Event Registry (`sysevent_registry`).
3. The `script` property should be a function that contains the JavaScript code to be executed. This script has access to the `current` (the record that triggered the event) and `event` (the event object itself) variables. You can provide an inline arrow function or import a function from another module.
4. By default, Script Actions run asynchronously. This is a best practice to avoid performance impacts on user transactions.
5. Use the `event.parm1` and `event.parm2` properties to pass additional information from the triggering script to the Script Action.
6. The `conditionScript` is a string containing a server-side script that must evaluate to true for the action to execute (e.g., `"gs.hasRole('admin')"`).
7. Before creating a Script Action, ensure the event it responds to is registered in the ServiceNow Event Registry.