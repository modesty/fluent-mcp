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
    script: get_glide_script(
            'sys_client_script', 
            'onSubmit client script that displays info message "Task has been submitted.", warning message "Warning: approval may take several days.", and error message "An error has occured."', 
            ''),
    active: true,
    applies_extended: true, // applies to the task table as well as any tables that extend it, e.g. incident and problem
    global: true,
    isolate_script: false,
})
```
