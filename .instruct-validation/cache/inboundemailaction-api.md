# Function: InboundEmailAction(config)

Configure an Inbound Email Action record. Inbound email actions define how ServiceNow
processes incoming emails — creating records, updating existing records, or running
custom logic when emails are received.

## Usage

```ts
InboundEmailAction({
  $id: Now.ID['ie0'],
  name: 'Inbound Email',
  description: 'Creates a new incident when an email is received',
  table: 'incident',
  type: 'new',
  action: 'record_action',
  active: true,
  order: 100,
  eventName: 'email.read',
  stopProcessing: false,
})
```
## Parameters

### config

`InboundEmailAction<keyof Tables>`

Inbound email action configuration object

See https://www.servicenow.com/docs/csh?topicname=c_InboundEmailActions.html&version=latest for more details

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **action** (required): `'record_action' | 'reply_email'`
  Action type that creates or updates a record. Default: 'record_action'

- **active** (optional): `boolean`
  Whether the inbound email action is active. Default: false

- **assignmentOperator** (optional): `string`
  Assignment operator for field actions.
  Only available for 'record_action' action type.

- **conditionScript** (optional): `string`
  Condition that must evaluate to true for the action to execute.
  If you include the condition in the script itself, leave this field blank.

- **description** (optional): `string`
  Documentation explaining the purpose and function of the action

- **eventName** (optional): `string`
  Event name that triggers this action. Default: 'email.read'

- **fieldAction** (optional): `string`
  Field action template defining field values to set on the target record.
  Uses ServiceNow's encoded query format with special syntax for dynamic values:
  - Static values: `field=value` (e.g., `active=true`, `priority=1`)
  - Static reference (sys_id): `field=<sys_id>` (e.g., `assigned_to=62826bf03710200044e0bfc8bcbe5df1`)
  - Datetime: `field=YYYY-MM-DD HH:MM:SS` (e.g., `activity_due=2026-03-17 00:00:00`)
  - Dynamic from sys_filter_option_dynamic: `fieldDYNAMIC<sys_id>` (e.g., `short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6`)
  - Comma-separated list: `fieldDYNAMIC<sys_id1>,<sys_id2>,<sys_id3>` (e.g., `additional_assignee_listDYNAMIC0a826bf03710200044e0bfc8bcbe5d7a,be82abf03710200044e0bfc8bcbe5d1c`)
  - Dynamic from email: Fields can be set from email properties (Subject, Body, Recipients, Sender, Sender->Company, etc.)
  - Text queries: `123TEXTQUERY321=value`
  - Separator: `^` between fields, ending with `^EQ`
  Example: `field1DYNAMIC<sys_id1>^static_field=value^field2DYNAMIC<sys_id2>^field3DYNAMIC<sys_id3>^EQ`
  Only available for 'record_action' action type.
  Note: Can only be used when 'table' field is specified.

- **filterCondition** (optional): `string`
  Encoded query string to filter which records this action applies to

- **from** (optional): `string | Record<'sys_user'>`
  Restrict this action to emails from a specific user. Accepts a GUID string or a Record object.

- **name** (optional): `string`
  Name of the inbound email action

- **order** (optional): `number`
  Execution order when multiple inbound actions match. Default: 100

- **replyEmail** (optional): `string`
  HTML content for auto-reply emails sent back to the sender.
  Only available for 'reply_email' action type.

- **requiredRoles** (optional): `(string | Role)[]`
  List of roles the sender must have for this action to trigger

- **script** (optional): `string | (args: unknown[]) => void`
  Script executed when the action triggers. Five objects are available in this script:
  - `current`: a GlideRecord — the target record being created or updated
  - `event`: a GlideRecord — the sysevent record
  - `email`: an EmailWrapper — the inbound email
  - `logger`: a ScopedEmailLogger — for logging email processing activity
  - `classifier`: an EmailClassifier — for classifying the email
  Consider using `Now.include()` to move the script to a separate `.js` file or using a function exported from your `src/server` modules.

- **stopProcessing** (optional): `boolean`
  When true, stops processing subsequent inbound email actions after this one executes. Default: false

- **table** (optional): `keyof Tables`
  Target table the action operates on (e.g., 'incident', 'sc_req_item')

- **type** (optional): `'new' | 'reply' | 'forward'`
  When to trigger: on new emails, replies, or forwards. Default: 'new'



## Examples

### Inbound Email Action with Field Actions

Create an inbound email action that sets field values using static and dynamic assignments

```typescript
/**
 * @title Inbound Email Action with Field Actions
 * @description Create an inbound email action that sets field values using static and dynamic assignments
 */

import { InboundEmailAction } from '@servicenow/sdk/core'

// Example 1: Static field values only
export const StaticFieldAction = InboundEmailAction({
    $id: Now.ID['static-field-action'],
    name: 'Set Static Fields',
    action: 'record_action',
    table: 'incident',
    type: 'new',
    active: true,
    // Set priority to 1 and active to true
    fieldAction: 'priority=1^active=true^EQ',
})

// Example 2: Dynamic field values (requires sys_filter_option_dynamic records)
export const DynamicFieldAction = InboundEmailAction({
    $id: Now.ID['dynamic-field-action'],
    name: 'Set Dynamic Short Description',
    action: 'record_action',
    table: 'incident',
    type: 'new',
    active: true,
    // short_description is set from email subject using OOB sys_filter_option_dynamic
    // The sys_id 'b637bd21ef3221002841f7f775c0fbb6' is the OOB "Subject" dynamic filter
    fieldAction: 'short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6^priority=2^EQ',
})

// Example 2b: Multiple dynamic fields from email (as configured in ServiceNow UI)
export const MultipleDynamicFields = InboundEmailAction({
    $id: Now.ID['multiple-dynamic-fields'],
    name: 'Set Multiple Dynamic Fields from Email',
    action: 'record_action',
    table: 'incident',
    type: 'new',
    active: true,
    // Multiple fields set dynamically - each DYNAMIC<sys_id> references a sys_filter_option_dynamic record
    // These can extract values from email properties (Subject, Sender, Body, etc.)
    // Format: field1DYNAMIC<sys_id1>^static_field=value^field2DYNAMIC<sys_id2>^EQ
    fieldAction:
        'short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6^active=true^descriptionDYNAMIC367bf121ef3221002841f7f775c0fbe2^caller_idDYNAMIC2fd8e97bef3221002841f7f775c0fbc1^EQ',
})

// Example 3: Mixed static, dynamic, and text query values
export const MixedFieldAction = InboundEmailAction({
    $id: Now.ID['mixed-field-action'],
    name: 'Mixed Field Assignments',
    action: 'record_action',
    table: 'cmn_notif_message',
    type: 'new',
    active: true,
    // Combines text query, dynamic field, and static value
    fieldAction: '123TEXTQUERY321=Issue^nameDYNAMICb637bd21ef3221002841f7f775c0fbb6^active=true^EQ',
})

// Example 4: Comprehensive field action with all value types
export const ComprehensiveFieldAction = InboundEmailAction({
    $id: Now.ID['comprehensive-field-action'],
    name: 'Comprehensive Field Assignments',
    action: 'record_action',
    table: 'incident',
    type: 'new',
    active: true,
    // Demonstrates all supported value types:
    // - Dynamic String from email: short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6 (Subject → String field)
    // - Dynamic Text from email: descriptionDYNAMIC367bf121ef3221002841f7f775c0fbe2 (Body → Text field)
    // - Dynamic Reference from email: caller_idDYNAMIC2fd8e97bef3221002841f7f775c0fbc1 (Sender → sys_user reference)
    // - Dynamic Reference from email: companyDYNAMICd27bf240ef0321002841f7f775c0fbeb (Sender's Company → core_company reference)
    // - Static integer values: priority=2, active=true (Boolean/Integer fields)
    // - Static reference sys_id: assignment_group=d625dccec0a8016700a222a0f7900d06 (sys_user_group reference)
    // - Datetime value: activity_due=2026-03-17 00:00:00 (ISO datetime format)
    // - Comma-separated list: additional_assignee_listDYNAMIC<sys_id1>,<sys_id2>,<sys_id3> (multiple sys_user references)
    fieldAction:
        'short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6^descriptionDYNAMIC367bf121ef3221002841f7f775c0fbe2^caller_idDYNAMIC2fd8e97bef3221002841f7f775c0fbc1^companyDYNAMICd27bf240ef0321002841f7f775c0fbeb^priority=2^active=true^assignment_group=d625dccec0a8016700a222a0f7900d06^activity_due=2026-03-17 00:00:00^additional_assignee_listDYNAMIC0a826bf03710200044e0bfc8bcbe5d7a,be82abf03710200044e0bfc8bcbe5d1c,6a826bf03710200044e0bfc8bcbe5dec^EQ',
})

```

### Inbound Email Action with Auto-Reply

Create an inbound email action that sends an automatic reply when an email is received

```typescript
/**
 * @title Inbound Email Action with Auto-Reply
 * @description Create an inbound email action that sends an automatic reply when an email is received
 */

import { InboundEmailAction } from '@servicenow/sdk/core'

export const AutoReplyOnEmail = InboundEmailAction({
    $id: Now.ID['auto-reply-on-email'],
    name: 'Auto Reply to Sender',
    action: 'reply_email',
    type: 'new',
    active: true,
    order: 200,
    replyEmail: '<p>Thank you for contacting us. We have received your email and will respond shortly.</p>',
})

```

