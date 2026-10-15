# UI Action: Form Context Menu

Add a form context-menu entry that displays the current Incident's unique identifier.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'incident_identifier_menu',
    table: 'incident',
    name: 'Show Record Identifier',
    actionName: 'incident_identifier_menu',
    active: true,
    form: { showContextMenu: true },
    showUpdate: true,
    script: "gs.addInfoMessage('Record sys_id: ' + current.getUniqueValue());",
});
```

The script runs on the server and reads the record without saving changes.
