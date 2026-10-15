# UI Action: Inspect Selected List Records

Add a classic list-choice action that displays the selected Incident sys_ids. This demonstrates reading the selection before implementing a bulk operation.

```typescript
import { UiAction } from '@servicenow/sdk/core';

UiAction({
    $id: 'inspect_selected_incidents',
    table: 'incident',
    name: 'Show Selected Record IDs',
    actionName: 'inspect_selected_incidents',
    active: true,
    list: { showListChoice: true },
    client: {
        isClient: true,
        onClick: 'inspectSelectedIncidentIds()',
    },
    script: `function inspectSelectedIncidentIds() {
    var selectedIds = g_list.getChecked();
    alert(selectedIds ? 'Selected record IDs: ' + selectedIds : 'Select at least one incident.');
}`,
});
```

`g_list.getChecked()` returns comma-separated identifiers. The script reads that string without changing the selected records.
