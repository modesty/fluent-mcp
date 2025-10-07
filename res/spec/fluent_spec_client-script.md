#**Context:** Client Script API spec: Client scripts are scripts that run on the client side, in the browser, when a record is displayed, inserted, updated, deleted, or when a cell is edited. Client scripts are used to define custom behavior or to enhance the functionality of forms and fields.
```typescript
// spec to create ClientScript in Fluent
ClientScript({
    $id: '', // string | guid, mandatory
    name: '', // string, name of the client script
    table: '', // string, name of the table on which the client script runs
    uiType: 'desktop', // string, user interface to which the client script applies: `desktop`|`mobile_or_service_portal`|`all`. Default is `desktop`.
    type: '', // string, optional, type of client script, which defines when it runs: `onCellEdit`|`onChange`|`onLoad`|`onSubmit`
    field: '', // string, optional, field on the table that the client script applies to. This property applies only when the type property is set to `onChange` or `onCellEdit`.
    description: '', // string, optional, description of the functionality and purpose of the client script
    messages: '', // string, optional, strings that are available to the client script as localized messages using `getmessage('[message]')`.
    active: true, // boolean, optional, whether the record is enabled, default true
    script: '', // ServiceNow script to fullfil the functional request in scripting,
    appliesExtended: false, // boolean, optional, indicates whether the client script applies to tables extended from the specified table, default false
    global: true, // boolean, optional, indicates whether the client script runs on all views of the table or only on specific views. Default is true.
    view: '', // string, optional, views of the table on which the client script runs. This property applies only when the `global` property is set to `false`
    isolateScript: false, // boolean, optional, indicates whether scripts run in strict mode, with access to direct DOM, `jQuery`, `prototype`, and the `window` object turned off. Default is false.
})
```
