# Scheduled Job API example: creating a new Scheduled Script that runs daily at 3PM in the GMT time zone. This job sets a new value for a system property
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
	$id: Now.ID['scheduledscript1'],
	table: 'sysauto_script',
	data: {
		name: 'daily scheduled script execution',
		active: true,
		conditional: false,
		run_type: 'daily',
		time_zone: 'GMT',
		run_time: '1970-01-01 15:00:00',
		script: get_glide_script(
			'sysauto_script',
			'update inline script to set a property using glide system (gs) api: gs.setProperty("scheduled_job_ran_1", "true");',
			''
		);
	}
})
```