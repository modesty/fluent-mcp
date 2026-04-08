# AI Agent API example: IT support agent definition
```typescript
import { AiAgent } from '@servicenow/sdk/core'

AiAgent({
	$id: Now.ID['agent_it_support'],
	name: 'IT Support Agent',
	description: 'Handles common IT support requests including password resets, software installations, and access provisioning',
	active: true,
	category: 'IT Service Management',
	instructions: 'You are an IT support agent. Help users resolve common IT issues. Always verify user identity before making changes. Escalate complex issues to human agents.',
	skills: [
		Now.ID['skill_password_reset'],
		Now.ID['skill_software_install'],
		Now.ID['skill_access_request'],
	],
})
```
