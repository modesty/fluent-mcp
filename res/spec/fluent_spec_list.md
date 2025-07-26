#**Context:** List API spec: Defines a list view [sys_ui_list] for a table. A list view displays a list of records from a table and can be customized to display specific columns and in a specific order.
```typescript
// spec to configure a List in Fluent
List({
    $id: '', // string, unique id for the record, typically using Now.ID["value"]
    table: '', // string, name of the table the list is for
    view: get_sys_id('sys_ui_view', ''), // Record<'sys_ui_view'>, The UI view (sys_ui_view) to apply to the list. Can import and use default_view, or can define a custom view using Record plugin.
    columns: [ // array of {element, position} objects representing the columns to be displayed in the List and their order
        { 
            element: '', // string, column name of the table
            position: 0, // number, column order
        }
    ],
});
```
