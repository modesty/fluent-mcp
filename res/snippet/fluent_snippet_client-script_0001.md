# create a client script that displays "Hello world" on any incident record when the record is loaded
```typescript
import { ClientScript } from '@servicenow/sdk/core'

ClientScript({
    $id: Now.ID['hello_world'], 
    name: 'Hello world client script',
    table: 'incident',
    ui_type: 'all',
    type: 'onLoad',
    description: 'Displays hello world on load',
    script: get_glide_script(
            'sys_client_script', 
            'onLoad client script that displays "Hello world"', 
            ''),
    active: true,
    applies_extended: false,
    global: true,
    isolate_script: false,
})
```
