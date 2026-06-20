# AliasTemplate API example: HTTP REST template with username/password credentials and a pre-filled base URL
```typescript
import { AliasTemplate } from '@servicenow/sdk/core'

export const HttpRestTemplate = AliasTemplate({
	$id: Now.ID['http-rest-template'],
	name: 'HTTP REST API Template',
	dynamicDataSchema: {
		connectionFields: [
			{ name: 'connectionUrl', label: 'Base URL', type: 'text', mandatory: true },
			{ name: 'useMid', label: 'Use MID Server', type: 'checkbox' },
		],
		credentialFields: [
			{ name: 'username', label: 'Username', type: 'text', mandatory: true },
			{ name: 'password', label: 'Password', type: 'password', mandatory: true },
		],
	},
	defaultDataTemplate: {
		connection: {
			table: 'http_connection',
			name: 'HTTP REST Connection',
			connectionUrl: 'https://api.example.com',
		},
		credential: {
			table: 'basic_auth_credentials',
			name: 'HTTP REST Credential',
		},
	},
})
```
