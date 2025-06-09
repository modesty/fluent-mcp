# create a client script that shows a message on the 'category' field if it is changed to be empty
```typescript
import { ClientScript } from '@servicenow/sdk/core'

ClientScript({
    $id: Now.ID['missing_category'], 
    name: 'Category Needed For Search',
    table: 'sc_cat_item',
    ui_type: 'desktop',
    type: 'onChange', // the client script is triggered when the specified field is changed in the form view
    field: 'category',
    messages: 'If you want users to be able to search for this Item, add it to a Category',
    script: get_glide_script(
            'sys_client_script', 
            'onChange client script that shows message "If you want users to be able to search for this Item, add it to a Category" when value is changed to empty', 
            ''),
    active: true,
    applies_extended: true,
    global: true,
    isolate_script: false,
})
```
