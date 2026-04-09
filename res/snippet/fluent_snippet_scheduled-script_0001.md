# Scheduled Script API example: daily script that runs at 3PM GMT and sets a system property
```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
	$id: Now.ID['scheduledscript1'],
	name: 'daily scheduled script execution',
	active: true,
	conditional: false,
	frequency: 'daily',
	timeZone: 'GMT',
	executionTime: { hours: 15, minutes: 0, seconds: 0 },
	script: `// Set the property to indicate the job has run
gs.setProperty("scheduled_job_ran_1", "true");

// Log that the job has been executed
gs.log("Daily scheduled script execution completed", "DailyScheduledScript");

// Get the current date/time
var currentTime = new GlideDateTime();
gs.info("Job executed at: " + currentTime.getDisplayValue());`
})
```
