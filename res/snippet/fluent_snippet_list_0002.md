# List API example, create an `app_ask_view` for a List of `incident` table. Always use Record API to create sys_ui_view record that's referenced by List's view property
```typescript
import { List, Record } from '@servicenow/sdk/core'

// Define the custom view
const app_task_view = Record({
    table: 'sys_ui_view',
    data: {
         name: 'app_task_view',
         title: 'app_task_view'
    }
 })

// Creates a list view of the incident table using a custom view and specifying 3 columns to show
List({
    $id: Now.ID['app_task_view_list'],
    table: 'incident',
    view: app_task_view, // using the custom view created above
    columns: [
        { element: "number", position: 0 },
        { element: "caller", position: 1 },
        { element: "short_description", position: 2 }
    ],
});
```
