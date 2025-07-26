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
    script: `function onSubmit() {
    // Display an info message with updated text
    g_form.addInfoMessage("Test Editing case.");
    
    // Keep existing warning message
    g_form.addWarningMessage("Warning: approval may take several days.");
    
    // Keep existing error message
    g_form.addErrorMessage("An error has occured.");
    
    // Return true to allow form submission
    return true;
}`,
    active: true,
    applies_extended: true, // applies to the task table as well as any tables that extend it, e.g. incident and problem
    global: true,
    isolate_script: false,
})
```
