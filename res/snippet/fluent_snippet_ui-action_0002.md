# create a new UI Action on incident table, showing message and hint on UI action mouse hover on the record. Needs user to have 'admin' role for this UI action to be executed. This UI action has a protection policy of 'read' only. Also, defining client scripts to show info message on onClick function, both on form and workspace form, which sets the 'client' field to true since 'onlick' function is specified.
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['rec0'],
    table: 'sys_ui_action',
    data: {
        name: 'Submit',
        script: get_glide_script('sys_ui_action', 'create an onClick function named "onClickFunction", to display info message "Dummy function call for onlick action from workspace"', ''),
        table: 'incident',
        action_name: 'sysverb_insert',
        active: true,
        client: true,
        ui16_compatible: true,
        format_for_configurable_workspace: true,
        comments: 'test comment',
        condition: 'gs.hasRole("admin");',
        hint: 'Test hint on mouse hover',
        messages: 'Test message on mouse hover',
        onclick: 'onClickFunction()',
        sys_overrides: '',
        sys_policy: 'read',
    },
})
```