# NowAssist Skill Config API example: incident summarization skill
```typescript
import { NowAssistSkillConfig } from '@servicenow/sdk/core'

NowAssistSkillConfig({
	$id: Now.ID['skill_summarize_incident'],
	name: 'Summarize Incident',
	description: 'Generates a concise summary of an incident including key details, timeline, and resolution steps',
	active: true,
	category: 'IT Service Management',
	utterances: [
		'Summarize this incident',
		'Give me a summary of the incident',
		'What happened with this incident',
	],
})
```
