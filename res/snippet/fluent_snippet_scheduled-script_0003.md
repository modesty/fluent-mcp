# Scheduled Job API example: creating a new Scheduled Script Execution that runs weekly on Thursdays at 9 PM in the US Mountain time zone. This job creates a incident record.
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
	$id: Now.ID['scheduledscript3'],
	table: 'sysauto_script',
	data: {
		name: 'weekly scheduled script execution',
		active: true,
		conditional: false,
		run_type: 'weekly',
		run_dayofweek: 4,
		time_zone: 'US/Mountain',
		run_time: '2025-03-13 21:00:00',
		script: get_glide_script(
			'sysauto_script', 
			'Write a function to create a new priorty 1 incident using glide record (GlideRecord) api: var gr = new GlideRecord("incident"); gr.setValue("priority", 1); gr.setValue("name", "weekly incident report"); gr.insert();', 
			''
		),
	}
})
```