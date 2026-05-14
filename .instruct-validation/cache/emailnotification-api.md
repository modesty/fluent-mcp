# Function: EmailNotification(config)

Creates an email notification configuration for ServiceNow. Email notifications are automated messages
sent to users when specific conditions are met, such as record updates, insertions, or system events.

This API allows you to define notifications with trigger conditions, recipient targeting, email content,
and digest options. Notifications can be triggered by database operations (insert/update), system events,
or manual execution.

## Parameters

### config

`EmailNotification<keyof Tables>`

Email notification configuration object

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`
  Unique identifier for the notification record

- **table** (required): `keyof Tables`
  The table that this notification applies to

- **active** (optional, default: true): `boolean`
  Whether the notification is active and will be sent

- **category** (optional, default: 'c97d83137f4432005f58108c3ffa917a'): `string | Record<'sys_notification_category'>`
  Category for organizing and managing notifications

- **description** (optional): `string`
  Description of the email notification

- **enableDynamicTranslation** (optional, default: false): `boolean`
  Whether to enable dynamic translation of notification content

- **mandatory** (optional, default: false): `boolean`
  Whether the notification is mandatory and cannot be unsubscribed from

- **name** (optional): `string`
  Name of the email notification

- **notificationType** (optional, default: 'email'): `'email' | 'vcalendar'`
  Type of notification: email or calendar invite (vcalendar)

- **triggerConditions** (optional): `TriggerConditions<keyof Tables>`
  Conditions that determine when the notification is triggered
  - **generationType** (optional, default: 'engine'): `'engine' | 'event' | 'triggered'` -- engine (record insert/update), event (system event), or triggered (manual)
  - **onRecordInsert** (optional): `boolean` -- send notification when a record is inserted
  - **onRecordUpdate** (optional): `boolean` -- send notification when a record is updated
  - **eventName** (optional): `string` -- name of the event that triggers this notification (for event-based)
  - **weight** (optional, default: 0): `number` -- execution order (lower numbers execute first)
  - **condition** (optional): `string` -- script-based condition that must be met
  - **advancedCondition** (optional): `string` -- advanced condition script for complex logic
  - **itemTable** (optional): `keyof Tables` -- the table that the notification item refers to
  - **affectedFieldOnEvent** (optional): `'parm1' | 'parm2'` -- which event parameter contains the affected field
  - **item** (optional, default: 'event.parm1'): `string` -- the item to use for the notification context
  - **order** (optional): `number` -- execution order of the notification

- **recipientDetails** (optional): `RecipientDetails`
  Configuration for who receives the notification
  - **recipientUsers** (optional): `(string | Record<'sys_user'>)[]` -- list of users who will receive the notification
  - **recipientFields** (optional): `string[]` -- fields on the record that contain recipient user references
  - **recipientGroups** (optional): `(string | Record<'sys_user_group'>)[]` -- list of groups whose members will receive the notification
  - **excludeDelegates** (optional, default: false): `boolean` -- whether to exclude delegates from receiving the notification
  - **isSubscribableByAllUsers** (optional, default: false): `boolean` -- whether all users can subscribe to this notification
  - **sendToCreator** (optional, default: true): `boolean` -- whether to send the notification to the record creator
  - **eventParm1WithRecipient** (optional): `boolean` -- whether event parameter 1 contains a recipient
  - **eventParm2WithRecipient** (optional): `boolean` -- whether event parameter 2 contains a recipient

- **emailContent** (optional): `EmailContent`
  Email content and formatting options
  - **contentType** (optional, default: 'text/html'): `'text/html' | 'multipart/mixed' | 'text/plain'` -- MIME content type for the email
  - **template** (optional): `string | Record<'sysevent_email_template'>` -- email template for formatting
  - **style** (optional): `string | Record<'sys_email_style'>` -- email style to apply
  - **subject** (optional): `string` -- subject line of the email
  - **message** (optional): `string` -- message content (legacy field)
  - **messageHtml** (optional): `string` -- HTML version of the message content
  - **messageText** (optional): `string` -- plain text version of the message content
  - **smsAlternate** (optional): `string` -- SMS alternate message for mobile notifications
  - **importance** (optional): `'low' | 'high'` -- priority/importance level of the email
  - **includeAttachments** (optional): `boolean` -- whether to include record attachments
  - **omitWatermark** (optional, default: false): `boolean` -- whether to omit the ServiceNow watermark
  - **from** (optional): `string` -- email address to use as the sender
  - **replyTo** (optional): `string` -- email address for replies
  - **pushMessageOnly** (optional, default: false): `boolean` -- send only as a push notification (no email)
  - **pushMessageList** (optional): `(string | Record<'sys_push_notif_msg'>)[]` -- list of push notification messages
  - **forceDelivery** (optional, default: false): `boolean` -- force delivery even if user preferences would block it

- **digest** (optional): `Digest`
  Digest configuration for batching multiple notifications
  - **allow** (optional, default: false): `boolean` -- whether users can receive this notification as a digest
  - **default** (optional, default: false): `boolean` -- whether digest mode is enabled by default
  - **defaultInterval** (optional): `string | Record<'sys_email_digest_interval'>` -- default time interval for digest delivery
  - **type** (optional, default: 'single'): `'single' | 'multiple'` -- single (one per digest) or multiple (combine)
  - **template** (optional): `string | Record<'sysevent_email_template'>` -- email template for digest emails
  - **subject** (optional): `string` -- subject line for digest emails
  - **html** (optional): `string` -- HTML content for digest emails
  - **text** (optional): `string` -- plain text content for digest emails
  - **separatorHtml** (optional, default: '\<br>\<hr>\<br>'): `string` -- HTML separator between notifications
  - **separatorText** (optional): `string` -- text separator between notifications
  - **from** (optional): `string` -- sender email for digest emails
  - **replyTo** (optional): `string` -- reply-to email for digest emails



## Examples

### Basic Email Notification Example

Create an email notification that fires when an incident is inserted or updated

```typescript
/**
 * @title Basic Email Notification Example
 * @description Create an email notification that fires when an incident is inserted or updated
 */

import { EmailNotification } from '@servicenow/sdk/core'

export const IncidentCreatedNotification = EmailNotification({
    $id: Now.ID['incident-created-notification'],
    table: 'incident',
    name: 'Incident Created Notification',
    description: 'Notify assigned user when an incident is created or updated',
    active: true,
    triggerConditions: {
        onRecordInsert: true,
        onRecordUpdate: true,
    },
    recipientDetails: {
        recipientFields: ['assigned_to'],
    },
    emailContent: {
        subject: 'Incident ${number}: ${short_description}',
        messageHtml:
            '<p>An incident has been created or updated.</p><p>Number: ${number}</p><p>Priority: ${priority}</p>',
    },
})

```

### Event-Based Notification

Create an email notification triggered by a system event

```typescript
/**
 * @title Event-Based Notification
 * @description Create an email notification triggered by a system event
 */

import { EmailNotification } from '@servicenow/sdk/core'

export const ChangeApprovalNotification = EmailNotification({
    $id: Now.ID['change-approval-notification'],
    table: 'change_request',
    name: 'Change Approval Required',
    active: true,
    triggerConditions: {
        generationType: 'event',
        eventName: 'change.request.approval',
        affectedFieldOnEvent: 'parm1',
    },
    recipientDetails: {
        recipientFields: ['assigned_to'],
        recipientGroups: ['CAB Approval'],
    },
    emailContent: {
        subject: 'Approval Required: Change ${number}',
        messageHtml: '<p>Change ${number} requires your approval.</p><p>Description: ${short_description}</p>',
        importance: 'high',
    },
})

```

### Notification with Digest

Create an email notification with digest batching enabled

```typescript
/**
 * @title Notification with Digest
 * @description Create an email notification with digest batching enabled
 */

import { EmailNotification } from '@servicenow/sdk/core'

export const TaskUpdateDigest = EmailNotification({
    $id: Now.ID['task-update-digest'],
    table: 'task',
    name: 'Task Update Summary',
    active: true,
    triggerConditions: {
        onRecordUpdate: true,
        condition: 'stateVALCHANGES',
    },
    recipientDetails: {
        recipientFields: ['assigned_to'],
        sendToCreator: false,
    },
    emailContent: {
        subject: 'Task Updated: ${number}',
        messageHtml: '<p>Task ${number} state changed to ${state}.</p>',
    },
    digest: {
        allow: true,
        default: true,
        type: 'multiple',
        subject: 'Task Update Summary',
        html: '<h2>Your task updates</h2>',
        separatorHtml: '<br><hr><br>',
    },
})

```

