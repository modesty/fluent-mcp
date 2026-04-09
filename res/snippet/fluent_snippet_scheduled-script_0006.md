# Scheduled Script API example: periodic script that runs every one and a half days
```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
	$id: Now.ID['scheduledscript6'],
	name: 'periodic scheduled script execution',
	active: true,
	conditional: false,
	frequency: 'periodically',
	executionStart: '2025-03-13 00:00:00',
	executionInterval: { days: 1, hours: 12 },
	script: `// Log the message when the job runs
gs.log("started scheduled job six", "ScheduledJobSix");

// Add an info message
gs.info("ran scheduled job 6");

// Record the execution timestamp
var currentTime = new GlideDateTime();
gs.setProperty("last_run_scheduled_job_6", currentTime.getDisplayValue());`
})
```
