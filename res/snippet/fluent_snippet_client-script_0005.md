# ClientScript API example:  editing a client script to update onSubmit client script displays info message change to Test Editing case.
```typescript
import { ClientScript } from '@servicenow/sdk/core'

ClientScript({
    $id: '4e7880f23714221002e674e8f2924b29', 
    name: 'Task submitted',
    table: 'task',
    ui_type: 'desktop',
    type: 'onSubmit',
    description: 'Example with multiple messages',
    messages: 'Task has been submitted.\nWarning: approval may take several days.\nAn error has occured.',
    script: get_glide_script(
            'sys_client_script', 
            'Update onSubmit client script that displays info message change to Test Editing case.', 
            'function onSubmit() { g_form.addInfoMessage("Task has been submitted."); g_form.addWarningMessage("Warning: approval may take several days.");g_form.addErrorMessage("An error has occured.");'
            ),
    active: true,
    applies_extended: true, // applies to the task table as well as any tables that extend it, e.g. incident and problem
    global: true,
    isolate_script: false,
})
```
