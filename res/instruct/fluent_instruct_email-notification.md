# Instructions for Fluent EmailNotification API
Always reference the EmailNotification API specification for more details.
1. The `table` property is mandatory and must be a valid ServiceNow table name. It determines which table records this notification applies to.
2. Use `generationType: 'engine'` (default) for record-based notifications triggered by inserts or updates. Set `onRecordInsert` and/or `onRecordUpdate` to `true` to specify which operations trigger the notification.
3. Use `generationType: 'event'` for event-based notifications, and provide `eventName` with the ServiceNow event name (e.g. `'incident.assigned'`).
4. `recipientFields` accepts field names from the record that contain user references — e.g., `['assigned_to', 'opened_by', 'watch_list']`. This is the most common way to target recipients dynamically.
5. Email subject and body fields (`subject`, `messageHtml`, `messageText`) support `${field_name}` substitution to insert record field values — e.g., `'Incident ${number} has been assigned'`.
6. Always provide at least one of `messageHtml` or `messageText` in `emailContent`. Use `messageHtml` for rich content; `messageText` as a fallback for plain-text email clients.
7. The `condition` in `triggerConditions` uses ServiceNow encoded query format — e.g., `'assigned_toISNOTEMPTY'` or `'state=2^priority=1'`.
8. Set `mandatory: true` only for critical notifications that users should not be able to unsubscribe from (e.g., security alerts). Most notifications should leave this as `false`.
9. `enableDynamicTranslation: true` translates the notification content based on the recipient's language preferences.
10. To enable digest batching, set `digest.allow: true` and optionally `digest.default: true` to make digest the default for subscribers.
