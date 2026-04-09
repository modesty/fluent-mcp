# Scheduled Script API example: run-once script with conditional execution
```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
	$id: Now.ID['scheduledscript2'],
	name: 'run once scheduled script execution',
	active: true,
	conditional: true,
	condition: `gs.getProperty('scheduled_job_2_ran') === 'false'`,
	frequency: 'once',
	executionStart: '2025-03-13 12:00:00',
	script: `// Set the property to indicate the job has run
gs.setProperty("scheduled_job_ran_2", "true");

// Log that the job has run
gs.log("Scheduled job 2 has run at " + new GlideDateTime().getDisplayValue(), "ScheduledJob2");`
})
```
