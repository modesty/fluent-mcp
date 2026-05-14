# **Context**: InboundEmailAction spec: Used to configure how ServiceNow processes incoming emails — creating records, updating existing records, or running custom logic when emails are received (`sys_email_action`).

```typescript
// Creates a new Inbound Email Action (`sys_email_action`)
import { InboundEmailAction } from '@servicenow/sdk/core'

InboundEmailAction({
  $id: '',                    // string | number | ExplicitKey<string>, mandatory
  action: 'record_action',    // 'record_action' | 'reply_email', mandatory — default: 'record_action'
  name: '',                   // string, optional — admin-facing name
  description: '',            // string, optional — documents the purpose
  table: 'incident',          // keyof Tables, optional — target table (e.g. 'incident', 'sc_req_item')
  type: 'new',                // 'new' | 'reply' | 'forward', optional — when to trigger (default 'new')
  active: false,              // boolean, optional — default false
  order: 100,                 // number, optional — execution order when multiple actions match (default 100)
  eventName: 'email.read',    // string, optional — event name that triggers this action
  stopProcessing: false,      // boolean, optional — stop downstream actions after this one runs (default false)
  conditionScript: '',        // string, optional — server-side condition that must evaluate true
  filterCondition: '',        // string, optional — encoded query to filter target records
  from: '',                   // string | Record<'sys_user'>, optional — restrict to specific sender
  requiredRoles: [],          // (string | Role)[], optional — roles the sender must have
  fieldAction: '',            // string, optional — field action template (record_action only). See format below.
  assignmentOperator: '',     // string, optional — assignment operator for field actions (record_action only)
  replyEmail: '',             // string, optional — HTML auto-reply content (reply_email only)
  script: '',                 // string | (args) => void, optional — runs when action triggers
                              //   Available in scope: current (GlideRecord target), event (sysevent),
                              //                       email (EmailWrapper), logger (ScopedEmailLogger),
                              //                       classifier (EmailClassifier)
                              //   Prefer Now.include('./script.js') over inline strings.
}): InboundEmailAction
```

## `fieldAction` query format

Encoded query format with special syntax — only usable when `table` is set and `action: 'record_action'`.

- Static value: `field=value` (e.g. `priority=1`, `active=true`)
- Static reference (sys_id): `field=<sys_id>` (e.g. `assigned_to=62826bf03710200044e0bfc8bcbe5df1`)
- Datetime: `field=YYYY-MM-DD HH:MM:SS` (e.g. `activity_due=2026-03-17 00:00:00`)
- Dynamic from email property: `fieldDYNAMIC<sys_id_of_sys_filter_option_dynamic>` (e.g. `short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6` maps the email Subject → short_description)
- Comma-separated list: `fieldDYNAMIC<sys_id1>,<sys_id2>,<sys_id3>`
- Text query: `123TEXTQUERY321=value`
- Separator: `^` between fields, terminate with `^EQ`

Common email dynamic sources (via OOB `sys_filter_option_dynamic` records): Subject, Body, Recipients, Sender, Sender's Company.

## Notes

- For OAuth-protected mailboxes, configure on `sys_email_account` before relying on this action.
- See https://www.servicenow.com/docs/csh?topicname=c_InboundEmailActions.html&version=latest for the platform reference.
