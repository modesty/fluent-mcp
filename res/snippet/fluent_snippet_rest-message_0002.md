# RestMessage API example: OAuth2 message with a shared JSON header and a POST function with a JSON body template
```typescript
import { RestMessage } from '@servicenow/sdk/core'

RestMessage({
	$id: Now.ID['crm-integration'],
	name: 'CRM Integration',
	endpoint: 'https://crm.example.com/api',
	description: 'Outbound integration with CRM for contact management',
	authenticationType: 'oauth2',
	oauthProfile: '00000000000000000000000000000002',
	headers: [
		{ $id: Now.ID['crm-header-content-type'], name: 'Content-Type', value: 'application/json' },
		{ $id: Now.ID['crm-header-accept'], name: 'Accept', value: 'application/json' },
	],
	functions: [
		{
			name: 'createContact',
			httpMethod: 'POST',
			endpoint: 'https://crm.example.com/api/contacts',
			content: '{"firstName":"${firstName}","lastName":"${lastName}","email":"${email}"}',
			variables: [
				{ $id: Now.ID['crm-create-var-first-name'], name: 'firstName' },
				{ $id: Now.ID['crm-create-var-last-name'], name: 'lastName' },
				{ $id: Now.ID['crm-create-var-email'], name: 'email' },
			],
		},
		{
			name: 'getContact',
			httpMethod: 'GET',
			endpoint: 'https://crm.example.com/api/contacts/${contactId}',
			variables: [{ $id: Now.ID['crm-get-var-contact-id'], name: 'contactId' }],
		},
	],
})
```
