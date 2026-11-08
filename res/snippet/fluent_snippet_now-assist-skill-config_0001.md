# NowAssist Skill Config API example: incident summarization skill with tools and prompts
```typescript
import { NowAssistSkillConfig, ScriptInclude } from '@servicenow/sdk/core'

// Script Include the Script tool calls: Class.create() pattern, accessible from all scopes,
// and each tool input name ('number') matches a parameter of the called function
export const IncidentLookup = ScriptInclude({
	$id: Now.ID['si_incident_lookup'],
	name: 'IncidentLookup',
	accessibleFrom: 'public',
	clientCallable: false,
	script: `var IncidentLookup = Class.create();
IncidentLookup.prototype = {
	initialize: function() {},

	// The skill's roleRestrictions only gate who can run it; they do not apply
	// record or field ACLs inside this script. GlideRecordSecure does: it reads
	// as the user the tool runs as, so a row that user cannot read is not found,
	// and each field (work notes included) is returned only if canRead() allows it.
	lookup: function(number) {
		try {
			var gr = new GlideRecordSecure('incident');
			if (!gr.get('number', number)) {
				// Same answer for missing and unreadable, so access is not disclosed
				return JSON.stringify({ error: 'Incident ' + number + ' not found' });
			}
			var displayed = { category: true, priority: true, state: true };
			var fields = ['number', 'short_description', 'category', 'priority', 'state', 'opened_at'];
			var result = {};
			for (var i = 0; i < fields.length; i++) {
				var name = fields[i];
				if (!gr[name].canRead()) continue;
				result[name] = displayed[name] ? gr.getDisplayValue(name) : gr.getValue(name);
			}
			if (gr.work_notes.canRead()) {
				result.work_notes = gr.work_notes.getJournalEntry(5);
			}
			return JSON.stringify(result);
		} catch (e) {
			gs.error('IncidentLookup.lookup failed: ' + e.message);
			return JSON.stringify({ error: 'Incident lookup failed' });
		}
	},

	type: 'IncidentLookup',
};`,
})

export const summarizeIncidentSkill = NowAssistSkillConfig(
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
				output: { $id: Now.ID['skill_summarize_lookup_output'] },
				scriptId: IncidentLookup,
				scriptFunctionName: 'lookup',
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
			userAccess: { $id: Now.ID['skill_summarize_user_access'], type: 'authenticated' },
			roleRestrictions: ['2831a114c611228501d4ea6c309d626d'],
		},
		deploymentSettings: {
			uiAction: { $id: Now.ID['skill_summarize_ui_action'], table: 'incident' },
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
						name: 'Summarization Prompt', // a prompt has no $id; each version does
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
