# UI Action: Programmatic Form Action in UI26

SDK v4.12.0+ supports `form: true` for UI26: the action can execute through a programmatic call without a visible button, link, or context-menu entry. Use a `form` object with `showButton: true` when you need a visible button instead.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'programmatic_incident_summary',
    table: 'incident',
    name: 'Programmatic Incident Summary',
    actionName: 'programmatic_incident_summary',
    active: true,
    form: true,
    showUpdate: true,
    script: "gs.addInfoMessage('Incident: ' + current.getDisplayValue());",
});
```

This example defines the server-side action only; calling it from your UI requires the matching `actionName`. The script reads the record without saving changes.
