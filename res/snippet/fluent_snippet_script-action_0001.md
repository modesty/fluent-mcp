# Script Action API example: creating a new Script Action that logs event details
```typescript
import { ScriptAction } from '@servicenow/sdk/core'

ScriptAction({
    $id: Now.ID['log_event_details_action'],
    name: 'Log Event Details',
    eventName: 'my.custom.event',
    script: `
        gs.log('Event received: ' + event.name);
        gs.log('Event parameter 1: ' + event.parm1);
        gs.log('Event parameter 2: ' + event.parm2);
        gs.log('Processing table: ' + current.getTableName());
        gs.log('Processing record sys_id: ' + current.sys_id);
    }`,
    active: true,
    description: 'Logs details of the my.custom.event to the system log.',
    order: 100
})
```