# Scheduled Script API example: monthly script on the 21st at 3PM Europe/Amsterdam that logs to system
```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
	$id: Now.ID['scheduledscript4'],
	name: 'monthly scheduled script execution',
	active: true,
	conditional: false,
	frequency: 'monthly',
	dayOfMonth: 21,
	timeZone: 'Europe/Amsterdam',
	executionTime: { hours: 15, minutes: 0, seconds: 0 },
	script: `// Log the message that the job has started
gs.log("started scheduled job four", "ScheduledJobFour");

// Add an info message
gs.info("ran scheduled job 4");

// Record the execution time
var currentDateTime = new GlideDateTime();
gs.setProperty("last_run_scheduled_job_4", currentDateTime.getDisplayValue());`
})
```
