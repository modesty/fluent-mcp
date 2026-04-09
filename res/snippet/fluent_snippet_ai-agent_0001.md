# AI Agent API example: IT support agent with tools and versioned instructions
```typescript
import { AiAgent } from '@servicenow/sdk/core'

AiAgent({
	$id: Now.ID['agent_it_support'],
	name: 'IT Support Agent',
	description: 'Handles common IT support requests including password resets, software installations, and access provisioning',
	agentRole: 'IT Support Assistant',
	active: true,
	agentType: 'internal',
	channel: 'nap_and_va',
	tools: [
		{
			name: 'Reset Password',
			type: 'subflow',
			subflowId: Now.ID['subflow_password_reset'],
			description: 'Resets user password via identity management subflow',
			executionMode: 'copilot',
		},
		{
			name: 'Lookup User Devices',
			type: 'crud',
			inputs: {
				operationName: 'lookup',
				table: 'cmdb_ci_computer',
				inputFields: [
					{ name: 'assigned_to', description: 'User to look up devices for', mandatory: true },
				],
				returnFields: [
					{ name: 'name' },
					{ name: 'model_id' },
					{ name: 'install_status' },
				],
				limit: 10,
			},
		},
		{
			name: 'Create Access Request',
			type: 'catalog',
			catalogItemId: Now.ID['cat_item_access_request'],
			description: 'Creates an access provisioning request via service catalog',
		},
	],
	versionDetails: [
		{
			name: 'v1',
			number: 1,
			instructions: 'You are an IT support agent. Help users resolve common IT issues. Always verify user identity before making changes. Escalate complex issues to human agents.',
			state: 'published',
		},
	],
	processingMessage: 'Looking into your IT request...',
	postProcessingMessage: 'Your IT request has been processed. Is there anything else I can help with?',
})
```
