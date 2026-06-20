# Instructions for Fluent Alias API
Always reference the Alias API specifications for more details.
1. Import `Alias` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`. `name` is also mandatory.
2. Use an Alias to give integrations, Flow Designer actions, and scripts a **named handle** to a connection/credential pair, so instance-specific URLs and secrets are never hard-coded in application logic.
3. Choose `type` to match intent: `'connection'` (default) creates a connection **and** credential alias; `'credential'` creates a credential-only alias with no connection record.
4. For connection aliases, set `connectionType` to one of `'httpConnection'` (default), `'jdbcConnection'`, `'basicConnection'`, or `'jmsConnection'`. `connectionType`, `retryPolicy`, and `multipleConnections` apply only when `type` is `'connection'`.
5. Reference fields (`parent`, `configurationTemplate`, `retryPolicy`) are flexible: pass a sys_id string, a `Record` reference, or the nested Fluent call directly (e.g. `retryPolicy: RetryPolicy({...})`, `configurationTemplate: AliasTemplate({...})`). Composing the Fluent calls keeps the whole integration definition in source.
6. Attach a `RetryPolicy` via `retryPolicy` to control transient-failure handling. If omitted, the platform fills in the out-of-box default policy for the resolved `connectionType`.
7. Use `configurationTemplate` (an `AliasTemplate`) to drive a guided, reusable connection-setup form for administrators. Use `parent` to create child aliases that inherit a parent's configuration (not supported for credential-only aliases).
8. Set `multipleConnections: true` only when a single alias must manage several active connections (e.g. multiple JDBC data sources).
9. Use `$meta.installMethod` (`'first install'`, `'demo'`, or `'once'`) to control when the record is loaded into the target instance.
