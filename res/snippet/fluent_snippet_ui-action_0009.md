# UI Action: Primary Form Button and Order

Give a form action primary styling and an explicit position. Lower `order` values appear before higher values.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'primary_incident_summary',
    table: 'incident',
    name: 'Review Incident Summary',
    actionName: 'primary_incident_summary',
    active: true,
    form: {
        showButton: true,
        style: 'primary',
    },
    showUpdate: true,
    order: 10,
    hint: 'Display the current incident summary',
    script: "gs.addInfoMessage(current.getValue('short_description'));",
});
```

Use primary styling for the main action in your form. This example displays information without updating the Incident.
