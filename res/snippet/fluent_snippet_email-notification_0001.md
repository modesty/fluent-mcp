# Email notification for incident assignment: sends HTML email to the assigned user when an incident is assigned or when priority changes to critical

```typescript
import { EmailNotification } from '@servicenow/sdk/core'

export const incidentAssignedNotification = EmailNotification({
    $id: Now.ID['incident_assigned_notification'],
    name: 'Incident Assigned Notification',
    description: 'Notifies the assigned user when an incident is assigned to them',
    table: 'incident',
    active: true,
    triggerConditions: {
        generationType: 'engine',
        onRecordInsert: false,
        onRecordUpdate: true,
        condition: 'assigned_toISNOTEMPTY^EQ',
    },
    recipientDetails: {
        recipientFields: ['assigned_to'],
        sendToCreator: false,
    },
    emailContent: {
        contentType: 'text/html',
        subject: 'Incident ${number} has been assigned to you',
        messageHtml: `
            <p>You have been assigned incident <strong>${'${number}'}</strong>.</p>
            <p><strong>Short Description:</strong> ${'${short_description}'}</p>
            <p><strong>Priority:</strong> ${'${priority}'}</p>
            <p><strong>State:</strong> ${'${state}'}</p>
            <p>Please review and take appropriate action.</p>
        `,
        messageText: 'Incident ${number} has been assigned to you. Short Description: ${short_description}. Priority: ${priority}.',
        importance: 'high',
    },
})

export const incidentCriticalPriorityNotification = EmailNotification({
    $id: Now.ID['incident_critical_priority_notification'],
    name: 'Critical Priority Incident Alert',
    description: 'Alerts the assigned team when an incident is escalated to critical priority',
    table: 'incident',
    active: true,
    triggerConditions: {
        generationType: 'engine',
        onRecordInsert: true,
        onRecordUpdate: true,
        condition: 'priority=1',
    },
    recipientDetails: {
        recipientFields: ['assigned_to', 'assignment_group'],
        sendToCreator: false,
    },
    emailContent: {
        contentType: 'text/html',
        subject: 'CRITICAL: Incident ${number} - Immediate Action Required',
        messageHtml: `
            <h2 style="color: red;">Critical Priority Incident</h2>
            <p><strong>Incident:</strong> ${'${number}'}</p>
            <p><strong>Description:</strong> ${'${short_description}'}</p>
            <p><strong>Opened:</strong> ${'${opened_at}'}</p>
            <p>This incident requires immediate attention.</p>
        `,
        importance: 'high',
    },
})
```
