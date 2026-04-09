# AI Agentic Workflow API example: incident triage workflow with team and triggers
```typescript
import { AiAgenticWorkflow } from '@servicenow/sdk/core'

AiAgenticWorkflow({
	$id: Now.ID['workflow_incident_triage'],
	name: 'Incident Triage Workflow',
	description: 'Automated workflow for triaging incoming incidents by analyzing symptoms, categorizing, and routing to appropriate teams',
	active: true,
	executionMode: 'copilot',
	team: {
		$id: Now.ID['team_incident_triage'],
		name: 'Incident Triage Team',
		description: 'Team of agents that collaborate on incident triage',
		members: [
			Now.ID['agent_it_support'],
			Now.ID['agent_categorization'],
		],
	},
	versions: [
		{
			name: 'v1',
			number: 1,
			instructions: 'Analyze incoming incidents, categorize by type, set priority based on impact and urgency, then route to the appropriate support team.',
			state: 'published',
		},
	],
	triggerConfig: [
		{
			name: 'New Incident Trigger',
			description: 'Triggers workflow when a new incident is created',
			channel: 'Now Assist Panel',
			active: true,
			targetTable: 'incident',
			triggerFlowDefinitionType: 'record_create',
			triggerCondition: 'priority=1^ORpriority=2',
		},
	],
	dataAccess: {
		description: 'Access for incident triage roles',
		roleList: [Now.ID['role_incident_manager']],
	},
})
```
