# create a new UI Action on incident table, showing message and hint on UI action for mouse hover on the record. Needs user to have 'admin' role for this UI action to be executed.
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['rec5'],
    table: 'sys_ui_action',
    data: {
        name: 'Submit',
        table: 'incident',
        action_name: 'sysverb_insert',
        comments: 'test comment',
        condition: 'gs.hasRole("admin");',
        hint: 'Test hint on mouse hover',
        messages: 'Test message hint on mouse hover',
        order: 10,
    },
})
```