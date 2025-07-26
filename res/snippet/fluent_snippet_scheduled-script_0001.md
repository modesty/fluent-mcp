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
		script: `// Set the property to indicate the job has run
gs.setProperty("scheduled_job_ran_1", "true");

// Log that the job has been executed
gs.log("Daily scheduled script execution completed", "DailyScheduledScript");

// Get the current date/time
var currentTime = new GlideDateTime();
gs.info("Job executed at: " + currentTime.getDisplayValue());`
	}
})
```