# AliasTemplate API example: OAuth2 template using a radio group to choose the auth flow, with a choice dropdown
```typescript
import { AliasTemplate } from '@servicenow/sdk/core'

export const OAuthApiTemplate = AliasTemplate({
	$id: Now.ID['oauth-api-template'],
	name: 'OAuth2 API Template',
	dynamicDataSchema: {
		connectionFields: [
			{ name: 'baseUrl', label: 'API Base URL', type: 'text', mandatory: true },
			{
				name: 'authFlow',
				label: 'Auth Flow',
				type: 'radio',
				mandatory: true,
				groups: [
					{
						name: 'client_credentials',
						label: 'Client Credentials',
						fields: [{ name: 'tokenUrl', label: 'Token URL', type: 'text', mandatory: true }],
					},
					{
						name: 'auth_code',
						label: 'Authorization Code',
						fields: [
							{ name: 'authUrl', label: 'Authorization URL', type: 'text', mandatory: true },
							{ name: 'tokenUrl', label: 'Token URL', type: 'text', mandatory: true },
						],
					},
				],
			},
			{
				name: 'environment',
				label: 'Environment',
				type: 'choice',
				choices: [
					{ name: 'dev', label: 'Development' },
					{ name: 'prod', label: 'Production' },
				],
			},
		],
		credentialFields: [
			{ name: 'clientId', label: 'Client ID', type: 'text', mandatory: true },
			{ name: 'clientSecret', label: 'Client Secret', type: 'password', mandatory: true },
		],
	},
	defaultDataTemplate: {
		connection: { table: 'http_connection', name: 'OAuth2 Connection', connectionUrl: 'https://api.example.com' },
		credential: { table: 'basic_auth_credentials', name: 'OAuth2 Credential' },
	},
})
```
