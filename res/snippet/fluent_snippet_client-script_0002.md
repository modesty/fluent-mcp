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
    script: `function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading || newValue === oldValue) {
        return;
    }
    
    // Show message when the category is cleared/empty
    if (!newValue) {
        g_form.addInfoMessage("If you want users to be able to search for this Item, add it to a Category");
    }
}`,
    active: true,
    applies_extended: true,
    global: true,
    isolate_script: false,
})
```
