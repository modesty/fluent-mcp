# Scheduled Job API example: creating a new Scheduled Script Execution that runs once at noon on March 13th 2025 but only if a condition returns true. 
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
	$id: Now.ID['scheduledscript2'],
	table: 'sysauto_script',
	data: {
		name: 'run once scheduled script execution',
		active: true,
		conditional: true,
		condition: `gs.getProperty('scheduled_job_2_ran') === 'false'`,
		run_type: 'once',
		run_start: '2025-03-13 12:00:00',
		script: get_glide_script(
			'sysauto_script',
			'update inline script to set a property using glide system (gs) api: gs.setProperty("scheduled_job_ran_2", "true");',
			''
		);
	}
})
```