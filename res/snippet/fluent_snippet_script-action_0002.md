# Script Action API example: creating a new Script Action to update an incident
```typescript
import { ScriptAction } from '@servicenow/sdk/core'

ScriptAction({
    $id: Now.ID['update_incident_action'],
    name: 'Update Incident Work Notes on custom event',
    eventName: 'incident.custom.update',
    script: `
        var incidentGR = new GlideRecord('incident');
        if (incidentGR.get(current.sys_id)) {
            incidentGR.work_notes = 'Event processed: ' + event.name + ' with parameter: ' + event.parm1;
            incidentGR.update();
        }
    }`,
    active: true,
    description: 'Updates the work notes of an incident when the incident.custom.update event is fired.',
    order: 200,
    conditionScript: "current.active == true"
})
```