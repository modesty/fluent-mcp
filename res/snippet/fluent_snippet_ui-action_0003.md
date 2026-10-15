# UI Action: Form Related Link

Use a related link below the form to display a short summary of an existing Incident.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'incident_summary_link',
    table: 'incident',
    name: 'Show Incident Summary',
    actionName: 'incident_summary_link',
    active: true,
    form: { showLink: true },
    showUpdate: true,
    hint: 'Display this incident number and short description',
    script: "gs.addInfoMessage(current.getValue('number') + ': ' + current.getValue('short_description'));",
});
```

`showLink` chooses related-link placement; it does not add a form header button.
