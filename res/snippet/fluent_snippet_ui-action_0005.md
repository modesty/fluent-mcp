# UI Action: List Banner Help Button

Add a client-side help button to the classic Incident list banner. The example displays a browser message and does not alter any records.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'incident_list_help',
    table: 'incident',
    name: 'Incident List Help',
    actionName: 'incident_list_help',
    active: true,
    list: { showBannerButton: true },
    client: {
        isClient: true,
        onClick: 'showIncidentListHelp()',
    },
    script: `function showIncidentListHelp() {
    alert('Open an incident to view its details, or select records for a list action.');
}`,
});
```

List placement is configured independently from form placement. No `form` configuration is needed here.
