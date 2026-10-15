# UI Action: Show a Record Summary

Add a server-side form button to existing Incident records. Clicking the button displays the record's display value without changing the record. Replace `table` and the action name for your application.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'show_record_summary',
    table: 'incident',
    name: 'Show Record Summary',
    actionName: 'show_record_summary',
    active: true,
    form: {
        showButton: true,
    },
    showInsert: false,
    showUpdate: true,
    script: "gs.addInfoMessage('Record: ' + current.getDisplayValue());",
});
```

The `form` object makes the button visible. Leave `client` unset for server-side execution; use `client.isClient` and `client.onClick` when authoring a client-side action instead.
