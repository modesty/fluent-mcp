# UI Action: Role-Restricted Form Button

Restrict a diagnostic message button to administrators using the `roles` array. Use the existing roles appropriate for your application.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'admin_incident_diagnostics',
    table: 'incident',
    name: 'Show Incident Diagnostics',
    actionName: 'admin_incident_diagnostics',
    active: true,
    form: { showButton: true },
    showUpdate: true,
    roles: ['admin'],
    script: "gs.addInfoMessage('Incident sys_id: ' + current.getUniqueValue());",
});
```

The button reads record information only. Preserve the record's ACLs when replacing this script with application logic.
