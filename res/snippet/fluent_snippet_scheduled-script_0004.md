# Scheduled Job API example: creating a new Scheduled Script Execution that runs monthly starting on the 21st at 3 PM in the Europe Amsterdam time zone. This job prints a string into the instance system logs.
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
	$id: Now.ID['scheduledscript4'],
	table: 'sysauto_script',
	data: {
		name: 'monthly scheduled script execution',
		active: true,
		conditional: false,
		run_type: 'monthly',
		run_dayofweek: 21,
		time_zone: 'Europe/Amsterdam',
		run_time: '1970-01-01 15:00:00',
		script: `// Log the message that the job has started
gs.log("started scheduled job four", "ScheduledJobFour");

// Add an info message
gs.info("ran scheduled job 4");

// Record the execution time
var currentDateTime = new GlideDateTime();
gs.setProperty("last_run_scheduled_job_4", currentDateTime.getDisplayValue());`
	}
})
```