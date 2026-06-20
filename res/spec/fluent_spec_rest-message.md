# **Context:** RestMessage API spec (SDK v4.8.0+): Creates outbound HTTP integrations (`sys_rest_message`) with a base URL, shared authentication, shared headers, and one or more callable HTTP-method functions (`sys_rest_message_fn`) invokable from server-side scripts via `sn_ws.RESTMessageV2('<name>', '<function>')`. Functions support `${varName}` substitution in endpoint, body, headers, and query params.

```typescript
// Creates a new outbound REST Message (`sys_rest_message`). Import from '@servicenow/sdk/core'.
RestMessage({
 $id: '', // Now.ID, mandatory - unique stable identifier (Now.ID['key']); hashed to sys_id at build time
 name: '', // string, mandatory - display name; first arg to RESTMessageV2('name','fn'). Case-sensitive. Max 40 chars
 endpoint: '', // string, mandatory - base URL; supports ${varName}. Max 200 chars
 description: '', // string, optional (default '') - human-readable purpose. Max 1000 chars
 authenticationType: 'noAuthentication', // 'noAuthentication' | 'basic' | 'oauth2', optional (default 'noAuthentication')
 basicAuthProfile: '', // string, optional - sys_id of `sys_auth_profile_basic`. REQUIRED when authenticationType is 'basic'
 oauthProfile: '', // string, optional - sys_id of `oauth_entity_profile`. REQUIRED when authenticationType is 'oauth2'
 access: 'packagePrivate', // 'packagePrivate' | 'public', optional (default 'packagePrivate')
 headers: [ // RestMessageHeader[], optional - message-level headers sent with EVERY function
   { $id: '', name: 'Content-Type', value: 'application/json' }, // $id (Now.ID) + name (≤80) + value (≤1000, supports ${var}) all required
 ],
 functions: [ // RestMessageFn[], optional - HTTP operations; include at least one for a useful definition
   {
     name: '', // string, mandatory - operation name; 2nd arg to RESTMessageV2. Case-sensitive. Max 100. Unique within the message
     httpMethod: 'GET', // 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' (uppercase), mandatory
     endpoint: '', // string, optional - full URL override for this function (supports ${var}). Max 200. Inherits base when omitted
     content: '', // string, optional (default '') - request body template with ${varName}. Use for POST/PUT/PATCH. Max 4000
     authenticationType: 'inheritFromParent', // 'inheritFromParent' | 'noAuthentication' | 'basic' | 'oauth2', optional (default inheritFromParent)
     basicAuthProfile: '', // string, optional - overrides parent Basic profile for this function only
     oauthProfile: '', // string, optional - overrides parent OAuth profile for this function only
     midServer: '', // string, optional - sys_id of `ecc_agent`; routes this function through a MID server
     lock: false, // boolean, optional (default false) - prevents editing this function on the instance
     headers: [ // RestMessageFnHeader[], optional - function-specific headers, ADDED to (not replacing) message-level headers
       { $id: '', name: '', value: '' }, // $id + name (≤80) + value (≤1000) all required
     ],
     variables: [ // RestMessageParamSubstitution[], optional - declares the ${varName} placeholders used by this function
       { $id: '', name: 'city', escapeType: 'noEscaping' }, // $id + name (≤80) required; escapeType 'noEscaping' (default, JSON) | 'escapeXml' (XML)
     ],
     queryParams: [ // RestMessageQueryParam[], optional - URL query params appended as ?key=value
       { $id: '', name: 'name', value: '${city}', order: 1 }, // $id + name (≤80) required; value (≤1000, static or ${var}) + order (default 0) optional
     ],
   },
 ],
}): RestMessage // returns a RestMessage object

// Runtime note: setStringParameter(name, value) XML-escapes regardless of escapeType. For JSON payloads always use
// setStringParameterNoEscape(name, value). mTLS (mutual auth) and OAuth-via-MID are not yet exposed in Fluent.
```
