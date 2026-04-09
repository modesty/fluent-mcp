# NowAssist Skill Config API example: incident summarization skill with tools and prompts
```typescript
import { NowAssistSkillConfig, ScriptInclude } from '@servicenow/sdk/core'

const IncidentLookup = ScriptInclude({
	$id: Now.ID['si_incident_lookup'],
	name: 'IncidentLookup',
	script: Now.include('./scripts/IncidentLookup.js'),
})

NowAssistSkillConfig(
	{
		$id: Now.ID['skill_summarize_incident'],
		name: 'Summarize Incident',
		shortDescription: 'Generates a concise summary of an incident',
		description: 'Generates a concise summary of an incident including key details, timeline, and resolution steps',
		state: 'published',
		inputs: [
			{
				$id: Now.ID['skill_summarize_incident_number_input'],
				name: 'incident number',
				description: 'The incident number to summarize',
				dataType: 'string',
				mandatory: true,
				testValues: 'INC0010001',
			},
		],
		outputs: [
			{
				$id: Now.ID['skill_summarize_incident_response_output'],
				name: 'response',
				description: 'The generated incident summary',
				dataType: 'string',
			},
		],
		tools: (t) => ({
			lookupIncident: t.Script('LookupIncident', {
				$id: Now.ID['skill_summarize_lookup_tool'],
				$capabilityId: Now.ID['skill_summarize_lookup_cap'],
				scriptId: IncidentLookup,
				inputs: [
					{
						$id: Now.ID['skill_summarize_lookup_input'],
						name: 'number',
						value: t.input['incident number'],
					},
				],
			}),
		}),
		securityControls: {
			userAccess: { type: 'authenticated' },
			roleRestrictions: ['2831a114c611228501d4ea6c309d626d'],
		},
		deploymentSettings: {
			uiAction: { table: 'incident' },
			nowAssistPanel: {
				enabled: true,
				roles: ['now_assist_panel_user'],
			},
		},
	},
	{
		providers: [
			{
				provider: 'Now LLM Service',
				prompts: [
					{
						$id: Now.ID['skill_summarize_prompt'],
						name: 'Summarization Prompt',
						versions: [
							{
								$id: Now.ID['skill_summarize_prompt_v1'],
								model: 'llm_generic_small_v2',
								temperature: 0.2,
								promptState: 'published',
								prompt: (p) =>
									`Summarize the following incident details concisely:\n\n${p.tool.lookupIncident.output}\n\nProvide a brief summary including: category, priority, current state, and key timeline events.`,
							},
						],
					},
				],
			},
		],
	}
)
```
