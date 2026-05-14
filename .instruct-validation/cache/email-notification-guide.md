
# Email Notification Guide

Create ServiceNow Email Notifications (`sysevent_email_action`) to send automated emails based on database operations, custom events, or manual triggers. This guide covers trigger types, content formats, recipients, digest configuration, templates, styles, scripts, access restrictions, and notification categories. Supported in SDK 4.3.0 or higher.

## When to Use

- Creating or modifying email notifications for database operations (insert/update)
- Implementing event-based email notifications triggered by custom events
- Setting up manual/on-demand notifications triggered by scripts
- Configuring recipient lists based on users, groups, or record fields
- Implementing calendar invitations (vCalendar notifications)
- Implementing digest notifications or email templates (advanced features)

## Core Principles

1. **ONE Notification Rule**: Create **one notification** per request unless explicitly asked for multiple. Use both `onRecordInsert: true` AND `onRecordUpdate: true` in one notification instead of separate notifications for create/insert and update.

2. **Simplicity First**: Default to inline content with minimal HTML (`<p>` and `<div>` tags only). No templates, no digest, no styles unless explicitly requested.

3. **Template Order**: If templates are requested, create the template first, then reference it. Never create inline content then retrofit.

4. **Field Validation**: Only use actual table fields (e.g., `${field_name}`). Email fields (`replyTo`, `from`) must be plain strings, never template variables.

5. **Business Rules Are Not Needed**: For engine-based notifications (`generationType: 'engine'`), do not create business rules -- the notification engine handles triggering automatically.

## Quick Decision Guide

**How Many Notifications?**

- "send email on insert/update" -- ONE notification with both flags
- "when created or updated" / "when created and updated" -- ONE notification with both flags
- "multiple notifications" -- Ask: "How many and for what purposes?"

**Should I Use Templates?**

- Default: NO (use inline content)
- Only if explicitly requested: "template", "reusable content"

**Should I Add Digest?**

- Default: NO
- Only if explicitly requested: "daily digest", "group emails"

**Should I Add Styles?**

- Default: NO (minimal HTML only)
- Only if explicitly requested: "styled", "branded", "formatted"

## Request Classification

- **SIMPLE** ("send email when...") -- ONE notification, inline content, no advanced features
- **COMPREHENSIVE** ("email system", "multiple notifications") -- Ask clarifying questions first
- **UNCLEAR** -- Ask: "How many notifications?", "Need templates?", "Group into digests?"

## Trigger Types

### Engine-Based (`generationType: 'engine'`)

Auto-triggers on insert/update. **Do not create business rules** to trigger the notification. Most common type for standard CRUD operations.

Choose when:
- Notification should fire on record insert/update
- No custom business logic needed
- Standard CRUD operation monitoring

### Event-Based (`generationType: 'event'`)

Triggers on custom ServiceNow events. Requires the Event Registry to register the event first. Requires a Business Rule (or equivalent) to fire the event via `gs.eventQueue()`.

Choose when:
- Custom workflow events trigger notification
- Complex business logic determines when to send
- Event parameters contain recipient information

### Triggered (`generationType: 'triggered'`)

Manual/script-triggered. Requires explicit triggering logic via scripts or business rules.

Choose when:
- Manual/on-demand sending required
- Script-controlled timing needed
- Maximum control over when notification sends

## Content Types

### HTML (`'text/html'`, default)

Rich emails with minimal HTML (`<p>`, `<div>`). Only create `messageHtml` field.

### Plain Text (`'text/plain'`)

Simple text-only for maximum compatibility or SMS. Only create `messageText` field.

### Multipart (`'multipart/mixed'`)

Both HTML and plain text versions for best compatibility. Must create both `messageHtml` AND `messageText` fields.

### Variable Syntax

When writing TypeScript code, use a single backslash to escape variables in template literals:

```typescript
// CORRECT - Single backslash in TypeScript code
messageHtml: `<p>Hello \${assigned_to.name}</p><p>Incident \${number}</p>`;

// WRONG - Double backslash
messageHtml: `<p>Hello \\${assigned_to.name}</p>`;

// WRONG - No backslash (JavaScript interpolates it)
messageHtml: `<p>Hello ${assigned_to.name}</p>`;
```

In TypeScript template literals (backticks), write `\${field_name}` with one backslash. This escapes the dollar sign so JavaScript does not try to interpolate it, producing the runtime string `${field_name}` which ServiceNow then substitutes.

## Recipients

**Field Recipients** (`recipientFields`): Dynamic recipients from record fields (e.g., `assigned_to`, `caller`). Most common and flexible pattern.

**Group Recipients** (`recipientGroups`): Array of group sys_ids for teams/departments. Preferred over individual users for scalability.

**User Recipients** (`recipientUsers`): Array of user sys_ids for fixed lists of specific individuals.

**Special Recipients**:
- `sendToCreator: true` -- Send to record creator
- `eventParm1WithRecipient` / `eventParm2WithRecipient` -- Event-based only
- `excludeDelegates: true` -- Exclude out-of-office delegates
- `isSubscribableByAllUsers: true` -- Allow user subscriptions

## API Reference

For the full property reference (EmailNotification, trigger conditions, email content, digest), see the `emailnotification-api` topic.

## Supporting Record Types

These are created using the `Record` API, not dedicated Fluent constructors.

### Email Template (`sysevent_email_template`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `String` | Yes | Template name (max 100, unique). |
| `subject` | `String` | No | Email subject (max 100). |
| `message_html` | `HTMLScript` | No | HTML message (max 4000). |
| `message_text` | `EmailScript` | No | Plain text message (max 4000). |
| `collection` | `TableName` | No | Target table. Default: `'incident'`. |
| `sys_version` | `String` | No | Version. Default: `'2'`. |
| `email_layout` | `Reference` | No | Reference to `sys_email_layout`. |

### Email Style (`sysevent_email_style`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `String` | Yes | Style name (max 100, unique). |
| `style` | `HTML` | No | CSS/HTML style content (max 65000). |

### Email Script (`sys_script_email`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `String` | Yes | Script name (max 100, unique). |
| `script` | `String` | No | Script contents (max 4000). |
| `new_lines_to_html` | `Boolean` | No | Convert newlines to HTML. Default: `false`. |

The script must maintain the structure `(function runMailScript(current, template, email, email_action, event) {...})(current, template, email, email_action, event);` and use `template.print()` to output content.

### Email Access Restriction (`email_access_restriction`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notification` | `Reference` | Yes | Reference to `sysevent_email_action`. |
| `conditions` | `Conditions` | Yes | Access conditions (max 8000). |
| `description` | `String` | No | Description (max 1000). |

Only one restriction per notification. Combine multiple conditions using `^` (AND) or `^OR` (OR). Do not use `Now.ID` for the notification field -- use `notificationVariable.$id` or a queried sys_id.

### Email Digest Interval (`sys_email_digest_interval`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `TranslatedText` | Yes | Interval name (max 100, unique). |
| `interval` | `GlideDuration` | Yes | Duration in format `YYYY-MM-DD HH:MM:SS`. |

Common intervals: Hourly `1970-01-01 01:00:00`, Daily `1970-01-02 00:00:00`, Weekly `1970-01-08 00:00:00`. Range: one hour to one week.

### Notification Category (`sys_notification_category`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `String` | Yes | Category name (max 32, unique). |
| `short_description` | `String` | No | Short description (max 1000). |

Default category sys_id: `c97d83137f4432005f58108c3ffa917a`.

## GUID Validation

All reference fields must contain valid 32-character hexadecimal sys_ids:
- `category` -- `sys_notification_category`
- `emailContent.template` -- `sysevent_email_template`
- `emailContent.style` -- `sys_email_style`
- `recipientDetails.recipientUsers` -- `sys_user`
- `recipientDetails.recipientGroups` -- `sys_user_group`
- `digest.defaultInterval` -- `sys_email_digest_interval`

## Common Mistakes to Avoid

- Do not use incorrect `$id` syntax -- always use `$id: Now.ID["value"]`
- Do not use double backslash in TypeScript template literals
- Do not hallucinate fields -- only use actual table fields in message content
- Do not assume or auto-populate `replyTo` and `from` fields
- Do not create business rules for engine-based notifications
- Do not create templates, digest, or styles unless explicitly requested
- Always include `import "@servicenow/sdk/global"` at the top of your code

## Examples

### Simple Insert/Update Notification

```typescript
import "@servicenow/sdk/global";
import { EmailNotification } from "@servicenow/sdk/core";

EmailNotification({
  $id: Now.ID["incident-update-notification"],
  table: "incident",
  name: "Incident Notification",
  triggerConditions: {
    generationType: "engine",
    onRecordUpdate: true,
    onRecordInsert: true
  },
  recipientDetails: {
    recipientFields: ["assigned_to"]
  },
  emailContent: {
    subject: "Incident \${number} Update",
    messageHtml: `<p>Hello \${assigned_to.name}</p><p>Incident \${number} has been updated.</p><p>Priority: \${priority}</p>`
  }
});
```

### Notification with Template

```typescript
import "@servicenow/sdk/global";
import { EmailNotification, Record } from "@servicenow/sdk/core";

const incidentTemplate = Record({
  $id: Now.ID["incident_update_template"],
  table: "sysevent_email_template",
  data: {
    name: "Incident Update Template",
    subject: "Incident \${number} has been updated",
    message_html: `<h1>Incident Update</h1>
      <p>Incident \${number} has been updated:</p>
      <ul>
        <li>State: \${state}</li>
        <li>Priority: \${priority}</li>
        <li>Assigned To: \${assigned_to}</li>
      </ul>`,
    collection: "incident",
    sys_version: "2"
  }
});

EmailNotification({
  $id: Now.ID["incident-with-template"],
  table: "incident",
  name: "Incident Notification With Template",
  active: true,
  triggerConditions: {
    generationType: "engine",
    onRecordUpdate: true
  },
  recipientDetails: {
    recipientFields: ["assigned_to"]
  },
  emailContent: {
    template: incidentTemplate
  }
});
```

### Digest Notification

```typescript
import "@servicenow/sdk/global";
import { EmailNotification } from "@servicenow/sdk/core";

EmailNotification({
  $id: Now.ID["daily-incident-digest"],
  table: "incident",
  name: "Daily Incident Digest",
  active: true,
  triggerConditions: {
    generationType: "engine",
    onRecordInsert: true
  },
  recipientDetails: {
    recipientFields: ["assignment_group"]
  },
  emailContent: {
    subject: "Incident \${number} Created",
    messageHtml: `<div style="border-bottom: 1px solid #ddd; padding: 10px;">
      <h4>\${number}: \${short_description}</h4>
      <p><strong>Priority:</strong> \${priority} | <strong>State:</strong> \${state}</p>
    </div>`
  },
  digest: {
    allow: true,
    type: "multiple",
    defaultInterval: "daily_digest_sys_id",
    subject: "Daily New Incidents - \${digest_count} incidents",
    html: "<h2>New Incidents (\${digest_count} total)</h2>",
    separatorHtml: '<hr style="margin: 15px 0;">'
  }
});
```

### Event-Based Notification

```typescript
import "@servicenow/sdk/global";
import { EmailNotification } from "@servicenow/sdk/core";

EmailNotification({
  $id: Now.ID["contract-expiring-notification"],
  table: "sn_contract_e_2_contract",
  name: "Contract Expiring - Account Owner Notification",
  active: true,
  triggerConditions: {
    generationType: "event",
    eventName: "sn_contract_e_2.contract.expiring"
  },
  recipientDetails: {
    eventParm1WithRecipient: true
  },
  emailContent: {
    subject: `Contract Expiring Soon: \${name}`,
    messageHtml: `<p>Dear \${account_owner.name},</p>
      <p>The following contract is approaching its expiration date:</p>`
  }
});
```

### Plain Text Notification

```typescript
import "@servicenow/sdk/global";
import { EmailNotification } from "@servicenow/sdk/core";

EmailNotification({
  $id: Now.ID["system-alert-plain-text"],
  table: "incident",
  name: "System Alert Plain Text",
  triggerConditions: {
    generationType: "engine",
    onRecordInsert: true,
    condition: "priority=1^EQ"
  },
  recipientDetails: {
    recipientFields: ["assigned_to"]
  },
  emailContent: {
    contentType: "text/plain",
    subject: "ALERT: Incident \${number}",
    messageText: `Hello \${assigned_to.name},\n\nIncident \${number} requires attention.\nPriority: \${priority}\nDescription: \${short_description}`
  }
});
```

### VCalendar Meeting Invitation

```typescript
import "@servicenow/sdk/global";
import { EmailNotification } from "@servicenow/sdk/core";

EmailNotification({
  $id: Now.ID["incident-review-meeting"],
  table: "incident",
  name: "Incident Review Meeting",
  notificationType: "vcalendar",
  triggerConditions: {
    generationType: "event",
    eventName: "incident.severity.1",
    condition: "active=true^EQ"
  },
  recipientDetails: {
    recipientFields: ["assignment_group", "assigned_to"]
  },
  emailContent: {
    subject: "Incident \${number} Review Meeting",
    messageHtml: `<div>You are invited to review incident \${number}</div>`
  }
});
```

