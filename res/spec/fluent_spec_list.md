#**Context:** List API spec: Defines a list view [sys_ui_list] for a table. A list view displays a list of records from a table and can be customized to display specific columns and in a specific order.
```typescript
// spec to configure a List in Fluent
List({
    table: '', // string, name of the table the list is for
    view: get_sys_id('sys_ui_view', ''), // Record<'sys_ui_view'>, The UI view (sys_ui_view) to apply to the list. Can import and use default_view, or can define a custom view using Record plugin.
    columns: [ // array of {element, position} objects representing the columns to be displayed in the List and their order
        { 
            element: '', // string, column name of the table
            position: 0, // number, column order
        }
    ],
    $meta: { // optional, application metadata
      installMethod: 'demo | first install ' // string, map the application metadata to an output directory that loads only in specific circumstances. *demo*: Outputs the application metadata to the metadata/unload.demo directory to be installed with the application when the Load demo data option is selected. *first install*: Outputs the application metadata to the metadata/unload directory to be installed only the first time an application is installed on an instance.
    }
});
```
