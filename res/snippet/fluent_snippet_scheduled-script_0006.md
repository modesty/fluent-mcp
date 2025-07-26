# Scheduled Job API example: creating a new Scheduled Job that runs periodically every one and a half days. This job prints a string into the instance system logs.
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
	$id: Now.ID['scheduledscript6'],
	table: 'sysauto_script',
	data: {
		name: 'periodic scheduled script execution',
		active: true,
		conditional: false,
		run_type: 'periodically',
		run_start: '2025-03-13 00:00:00',
		run_period: '1970-01-02 12:00:00',
		script: `// Log the message when the job runs
gs.log("started scheduled job six", "ScheduledJobSix");

// Add an info message
gs.info("ran scheduled job 6");

// Record the execution timestamp
var currentTime = new GlideDateTime();
gs.setProperty("last_run_scheduled_job_6", currentTime.getDisplayValue());`
	}
})
```