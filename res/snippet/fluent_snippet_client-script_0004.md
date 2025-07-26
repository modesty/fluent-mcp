# create a client script that displays an alert on the 'sys_user' list when a User ID is edited to be too long or too short
```typescript
import { ClientScript } from '@servicenow/sdk/core'

ClientScript({
    $id: Now.ID['username_length'], 
    name: 'Username length alert',
    table: 'sys_user',
    ui_type: 'desktop',
    type: 'onCellEdit', // the client script is triggered when the specified field is edited in list view
    field: 'user_name',
    description: 'Displays an alert message when the username is too long or too short',
    messages: 'User IDs must be between 3 and 20 characters long.',
    script: `function onCellEdit(sysIDs, table, cellName, oldValues, newValue, callback) {
    // Check if the username length is too short or too long
    if (newValue.length < 3 || newValue.length > 20) {
        // Show the alert message
        alert("User IDs must be between 3 and 20 characters long.");
        
        // Return the original value to revert the change
        return false;
    }
    
    // Continue with the edit
    return true;
}`,
    active: true,
    applies_extended: false,
    global: false,
    view: 'workspace', // only run the client script in the workspace view
    isolate_script: false,
})
```
