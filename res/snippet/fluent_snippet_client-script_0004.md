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
    script: get_glide_script(
            'sys_client_script', 
            'onCellEdit client script that displays an alert "User IDs must be between 3 and 20 characters long." when the username is too long or too short', 
            ''),
    active: true,
    applies_extended: false,
    global: false,
    view: 'workspace', // only run the client script in the workspace view
    isolate_script: false,
})
```
