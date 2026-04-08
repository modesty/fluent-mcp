# AI Agent Workflow API example: incident triage workflow
```typescript
import { AiAgentWorkflow } from '@servicenow/sdk/core'

AiAgentWorkflow({
	$id: Now.ID['workflow_incident_triage'],
	name: 'Incident Triage Workflow',
	description: 'Automated workflow for triaging incoming incidents by analyzing symptoms, categorizing, and routing to appropriate teams',
	active: true,
	agent: Now.ID['agent_it_support'],
	steps: [
		{ name: 'Analyze Symptoms', type: 'action', action: 'analyze_incident_description' },
		{ name: 'Categorize Issue', type: 'decision', action: 'determine_category' },
		{ name: 'Set Priority', type: 'action', action: 'calculate_priority' },
		{ name: 'Route to Team', type: 'action', action: 'assign_to_group' },
	],
})
```
