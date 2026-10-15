# UI Action: Client-Side Form Message

Show the Incident number in the browser without a server request or a record update. The `onClick` call and function name must match.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'preview_incident_number',
    table: 'incident',
    name: 'Preview Incident Number',
    actionName: 'preview_incident_number',
    active: true,
    form: { showButton: true },
    showUpdate: true,
    client: {
        isClient: true,
        onClick: 'previewIncidentNumber()',
    },
    script: `function previewIncidentNumber() {
    g_form.addInfoMessage('Incident: ' + g_form.getValue('number'));
}`,
});
```

Client-side UI Action scripts are strings and use browser APIs such as `g_form`, rather than the server-side `current` record.
