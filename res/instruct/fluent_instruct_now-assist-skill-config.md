# Instructions for Fluent NowAssist Skill Config API
Always reference the NowAssist Skill Config API specifications for more details.
1. Import `NowAssistSkillConfig` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`.
2. The `name` field is mandatory and should clearly describe the skill's function (e.g., "Summarize Incident", "Generate Knowledge Article").
3. Use `utterances` to define sample phrases that should trigger the skill. These help NowAssist map user intents to the correct skill.
4. Define `inputParameters` to specify what data the skill requires as input, and `outputParameters` to define what the skill produces.
5. Use the `category` field to organize skills by domain (e.g., 'IT Service Management', 'HR', 'Customer Service').
6. Set `active: false` to disable a skill configuration without deleting it.
7. NowAssist Skill configurations work within the NowAssist framework and are intended to extend AI-powered assistance capabilities in the ServiceNow platform.
