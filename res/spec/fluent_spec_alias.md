# **Context:** Alias API spec (SDK v4.8.0+): Creates a Connection & Credential Alias (`sys_alias`) — a named handle that integrations, Flow Designer actions, and scripts use to reference a connection/credential pair without hard-coding instance-specific values. Reference fields (`configurationTemplate`, `retryPolicy`, `parent`) accept a sys_id string, a `Record` reference, OR the corresponding Fluent call (`AliasTemplate()`, `RetryPolicy()`, `Alias()`) directly.

```typescript
// Creates a new Connection & Credential Alias (`sys_alias`). Import from '@servicenow/sdk/core'.
Alias({
 $id: '', // string | number | guid, mandatory - unique identifier for the record
 name: '', // string, mandatory - display name for the alias
 type: 'connection', // 'connection' | 'credential', optional - 'connection' (default) creates a connection+credential alias;
   // 'credential' creates a credential-only alias (no connection record)
 connectionType: 'httpConnection', // 'httpConnection' | 'jdbcConnection' | 'basicConnection' | 'jmsConnection', optional
   // underlying connection type (default 'httpConnection'). ONLY applies when type is 'connection'
 description: '', // string, optional - a description of the alias
 parent: '', // string | Record<'sys_alias'> | Alias, optional - parent alias for child aliases that inherit configuration.
   // Pass a sys_id, a Record reference, or an Alias() call directly. NOT supported for credential-only aliases
 configurationTemplate: '', // string | Record<'sys_alias_templates'> | AliasTemplate, optional - reference to a configuration template.
   // Pass the template sys_id, a Record reference, or an AliasTemplate() call directly
 retryPolicy: '', // string | Record<'sys_retry_policy'> | RetryPolicy, optional - default retry policy. ONLY applies when type is 'connection'.
   // Pass a sys_id, a Record reference, or a RetryPolicy() call directly. When omitted, the plugin fills the OOB default for the connectionType
 multipleConnections: false, // boolean, optional - whether the alias supports multiple active connections (default false). ONLY when type is 'connection'
 $meta: { // object, optional - maps the record to an output folder that loads only in specific circumstances
   installMethod: 'once', // 'first install' | 'demo' | 'once' - 'first install' -> 'unload', 'demo' -> 'unload.demo'
 },
}): Alias // returns an Alias object
```
