# create a client script that displays multiple messages when a task record is submitted
```typescript
import { ClientScript } from '@servicenow/sdk/core'

ClientScript({
    $id: Now.ID['submit_task'], 
    name: 'Task submitted',
    table: 'task',
    ui_type: 'desktop',
    type: 'onSubmit',
    description: 'Example with multiple messages',
    messages: 'Task has been submitted.\nWarning: approval may take several days.\nAn error has occured.',
    script: `function onSubmit() {
    // Display an info message
    g_form.addInfoMessage("Task has been submitted.");
    
    // Display a warning message
    g_form.addWarningMessage("Warning: approval may take several days.");
    
    // Display an error message
    g_form.addErrorMessage("An error has occured.");
    
    // Allow the form to be submitted
    return true;
}`,
    active: true,
    applies_extended: true, // applies to the task table as well as any tables that extend it, e.g. incident and problem
    global: true,
    isolate_script: false,
})
```
