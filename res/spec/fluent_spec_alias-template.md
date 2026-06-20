# **Context:** AliasTemplate API spec (SDK v4.8.0+): Creates a Connection & Credential alias template (`sys_alias_templates`) — a reusable definition that controls the **form fields and default values** shown when an administrator sets up a connection alias on the platform. Templates drive the wizard UI that collects connection URLs, credentials, and other integration settings. Reference a template from an `Alias` via its `configurationTemplate` property.

```typescript
// Creates a new alias template (`sys_alias_templates`). Import from '@servicenow/sdk/core'.
AliasTemplate({
 $id: '', // string | number | guid, mandatory - unique id; use Now.ID['kebab-name'] for a stable scope-tied sys_id
 name: '', // string, mandatory - display name shown in admin views and the connection alias picker
 dynamicDataSchema: { // DynamicDataSchema, mandatory - the fields rendered by the Connection & Credential wizard
   connectionFields: [ /* DynamicDataSchemaField[] */ ], // required - connection-section fields (URL, host, port, ...)
   credentialFields: [ /* DynamicDataSchemaField[] */ ], // required - credential-section fields (username, password, token, ...)
   additionalFields: [ /* DynamicDataSchemaField[] */ ], // optional - extra fields not categorised as connection/credential
 },
 defaultDataTemplate: { // DefaultDataTemplate, mandatory - default values pre-populated into the created records
   connection: { // optional - defaults for the connection record
     table: 'http_connection', // required: 'http_connection' | 'jdbc_connection' | 'orch_Jms_ds' | 'sys_connection'
     name: '', // required - default display name
     connectionUrl: '', // required - default connection URL
     useMid: false, // optional - default to using a MID Server
     // any additional keys become default field values on the connection record
   },
   credential: { // optional - defaults for the credential record
     table: 'basic_auth_credentials', // required: TableName - determines the credential form (basic/cert/OAuth/api key/...)
     name: '', // optional - default display name
     // any additional keys become default field values on the credential record
   },
   additional: {}, // optional - { [key: string]: unknown } freeform data made available to postProcessScript
 },
 // Script fields: pass an inline string, Now.include('./file.js'), or an imported server-module function from src/server/.
 // Each receives (aliasId, connectionSysId, jsonDefaultData, jsonDynamicData). Omit to let the build write a no-op stub.
 preEditScript: undefined, // string | ((aliasId, connectionSysId, jsonDefaultData, jsonDynamicData) => Array<{name, value}>), optional
 onEditScript: undefined, // string | ((...4 args) => void), optional - runs each time the form is edited (keep dependent fields in sync)
 postProcessScript: undefined, // string | ((...4 args) => void), optional - runs after a connection/credential is created
 testAction: undefined, // string | Record<'sys_hub_action_type_definition'> | ReturnType<typeof Action>, optional - Flow action that tests the connection
}): AliasTemplate // returns an AliasTemplate object

// DynamicDataSchemaField (discriminated union on `type`):
//   base: { name (req), label?, type (req), defaultValue?, hint?, mandatory? }
//   type: 'text' | 'date' | 'number' | 'password' | 'checkbox' | 'file'   -> no extra props
//   type: 'radio'      -> groups?:  GroupSchema[]   ({ name (req), label?, fields: Field[] (req), defaultGroup? })
//   type: 'choice'     -> choices?: ChoiceSchema[]  ({ name (req), label (req) })
//   type: 'reference'  -> table: TableName (req), query?: string
```
