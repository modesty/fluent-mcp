# UI Action: Conditional Visibility

Display a summary button only for an existing, active Incident. `condition` is evaluated on the server to decide whether the action is visible.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'active_incident_summary',
    table: 'incident',
    name: 'Show Active Incident Summary',
    actionName: 'active_incident_summary',
    active: true,
    form: { showButton: true },
    showInsert: false,
    showUpdate: true,
    condition: 'current.active == true',
    script: "gs.addInfoMessage('Active incident: ' + current.getDisplayValue());",
});
```

Visibility conditions complement table and field ACLs; the example does not grant additional record access.
