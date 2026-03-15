# **Context:** EmailNotification API spec: Used to create an Email Notification (`sysevent_email_action`) in ServiceNow — automated emails sent to users when specific conditions are met on a table record, system event, or on demand.

```typescript
import { EmailNotification } from '@servicenow/sdk/core'

// Creates a new Email Notification (`sysevent_email_action`)
EmailNotification({
    $id: Now.ID['my_notification'], // string | Now.ID key, mandatory — unique identifier

    // ─── Core fields ───
    table: 'incident',      // string (TableName), mandatory — the table this notification applies to
    name: '',               // string, optional — display name of the notification
    description: '',        // string, optional — description
    active: true,           // boolean, optional — whether the notification is active, default: true
    mandatory: false,       // boolean, optional — if true, users cannot unsubscribe, default: false
    notificationType: 'email', // 'email' | 'vcalendar', optional — default: 'email'
    category: '',           // string | Record<'sys_notification_category'>, optional — notification category sys_id
    enableDynamicTranslation: false, // boolean, optional — translate content dynamically, default: false

    // ─── Trigger conditions ───
    triggerConditions: {
        generationType: 'engine', // 'engine' | 'event' | 'triggered', optional — default: 'engine'
        // For 'engine' (record-based):
        onRecordInsert: true,  // boolean, optional — send on record insert
        onRecordUpdate: true,  // boolean, optional — send on record update
        condition: '',         // string, optional — encoded query condition for when to send
        advancedCondition: '', // string, optional — advanced script condition
        weight: 0,             // number, optional — execution order, default: 0
        order: 0,              // number, optional — execution order
        // For 'event' (event-based):
        eventName: '',         // string, optional — system event name (e.g. 'incident.assigned')
        affectedFieldOnEvent: 'parm1', // 'parm1' | 'parm2', optional — which event parm contains the affected field
        item: 'event.parm1',   // string, optional — item context, default: 'event.parm1'
        itemTable: 'incident', // TableName, optional — table the item belongs to
    },

    // ─── Recipients ───
    recipientDetails: {
        recipientUsers: [],    // (string | Record<'sys_user'>)[], optional — specific user sys_ids or User records
        recipientFields: [],   // string[], optional — field names on the record containing user references (e.g. ['assigned_to', 'opened_by'])
        recipientGroups: [],   // (string | Record<'sys_user_group'>)[], optional — group sys_ids
        sendToCreator: false,  // boolean, optional — send to record creator, default: true
        excludeDelegates: false, // boolean, optional — exclude delegate users, default: false
        isSubscribableByAllUsers: false, // boolean, optional — all users can subscribe, default: false
        eventParm1WithRecipient: false,  // boolean, optional — event parm1 contains a recipient
        eventParm2WithRecipient: false,  // boolean, optional — event parm2 contains a recipient
    },

    // ─── Email content ───
    emailContent: {
        contentType: 'text/html', // 'text/html' | 'multipart/mixed' | 'text/plain', optional — default: 'text/html'
        subject: '',           // string, optional — email subject line (supports ${field_name} substitution)
        messageHtml: '',       // string, optional — HTML body (supports ${field_name} substitution)
        messageText: '',       // string, optional — plain text body
        message: '',           // string, optional — legacy message field
        smsAlternate: '',      // string, optional — SMS version of the message
        importance: 'high',    // 'low' | 'high', optional — email importance/priority
        template: '',          // string | Record<'sysevent_email_template'>, optional — email template sys_id
        style: '',             // string | Record<'sys_email_style'>, optional — email style sys_id
        from: '',              // string, optional — sender email address override
        replyTo: '',           // string, optional — reply-to email address
        includeAttachments: false, // boolean, optional — include record attachments
        omitWatermark: false,  // boolean, optional — remove ServiceNow watermark, default: false
        pushMessageOnly: false, // boolean, optional — only send as push notification, default: false
        pushMessageList: [],   // (string | Record<'sys_push_notif_msg'>)[], optional
        forceDelivery: false,  // boolean, optional — send even if user prefs block it, default: false
    },

    // ─── Digest (optional — batch multiple notifications) ───
    digest: {
        allow: false,          // boolean, optional — allow digest mode, default: false
        default: false,        // boolean, optional — digest on by default, default: false
        defaultInterval: '',   // string | Record<'sys_email_digest_interval'>, optional
        type: 'single',        // 'single' | 'multiple', optional — default: 'single'
        template: '',          // string | Record<'sysevent_email_template'>, optional
        subject: '',           // string, optional — digest email subject
        html: '',              // string, optional — digest HTML content
        text: '',              // string, optional — digest plain text content
        separatorHtml: '<br><hr><br>', // string, optional — HTML separator between notifications
        separatorText: '\n---\n',      // string, optional — text separator
        from: '',              // string, optional — digest sender address
        replyTo: '',           // string, optional — digest reply-to address
    },
}): EmailNotification<TableName> // returns an EmailNotification object
```
