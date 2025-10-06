# List API Exmaple: create a List of service catalog item table with default view
```typescript
import { List, default_view } from '@servicenow/sdk/core'

// Creates a list view of the catalog items table using the default view and specifying 3 columns to show
List({
    table: 'sc_cat_item',
    view: default_view, // importing and using the default_view object
    columns: [
        { element: "name", position: 0 },
        { element: "short_description", position: 1 },
        { element: "sys_created_on", position: 2 }
    ],
});
```
