# Instructions for Fluent Inbound Email Action API
Always reference the Inbound Email Action API specifications for more details.
1. Import `InboundEmailAction` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`. The underlying table is `sys_email_action`. Not to be confused with outbound Email Notification (`sysevent_email_action`) which is a separate API.
2. The `action` field controls behavior: `'record_action'` creates or updates a target record; `'reply_email'` sends an auto-reply to the sender. `fieldAction` and `assignmentOperator` apply only to `'record_action'`; `replyEmail` applies only to `'reply_email'`.
3. The `type` field controls when the action fires: `'new'` (default) for new emails, `'reply'` for replies to system-sent emails, `'forward'` for forwarded emails.
4. The `fieldAction` string is encoded with `^` separator and `^EQ` terminator. Supported value types: static (`field=value`), static-reference (`field=<sys_id>`), datetime (`field=YYYY-MM-DD HH:MM:SS`), dynamic from email (`fieldDYNAMIC<sys_id>` where the sys_id is a `sys_filter_option_dynamic` record), comma-separated list, and text query (`123TEXTQUERY321=value`).
5. `fieldAction` can only be used when `table` is specified. Without `table`, leave `fieldAction` empty and use `script` instead.
6. Prefer `Now.include('./inbound-email-script.js')` over inline `script` strings — keeps the script in a real `.js` file for editor/lint support.
7. Inside `script`, five objects are available: `current` (GlideRecord target), `event` (sysevent record), `email` (EmailWrapper for the inbound message), `logger` (ScopedEmailLogger), `classifier` (EmailClassifier). Use `logger.info()` / `logger.warn()` for activity tracing.
8. Use `conditionScript` for server-side filtering (e.g. `email.subject_lower().indexOf('urgent') >= 0`). Use `filterCondition` (encoded query) for table-record filtering on `'reply'`/`'forward'` types.
9. Set `stopProcessing: true` on the first matching action when subsequent actions should not run. Combine with `order` to control which action wins.
10. Use `from: '<sys_user record or sys_id>'` to restrict the action to a specific sender. Use `requiredRoles` to require the sender hold given roles.
11. Always provide a meaningful `description` — inbound email actions are often diagnosed reactively, and the description is the first thing an operator reads.
