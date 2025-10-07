# create a client script that displays "Hello world" on any incident record when the record is loaded
```typescript
import { ClientScript } from '@servicenow/sdk/core'

ClientScript({
    $id: Now.ID['hello_world'],
    name: 'Hello world client script',
    table: 'incident',
    uiType: 'all',
    type: 'onLoad',
    description: 'Displays hello world on load',
    script: `function onLoad() {
    // Display "Hello world" message when the form loads
    g_form.addInfoMessage("Hello world");

    // Log to console for debugging
    console.log("Hello world client script executed");
}`,
    active: true,
    appliesExtended: false,
    global: true,
    isolateScript: false,
})
```
