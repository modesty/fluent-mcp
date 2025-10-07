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
		runType: 'once',
		runStart: '2025-03-13 12:00:00',
		script: `// Set the property to indicate the job has run
gs.setProperty("scheduled_job_ran_2", "true");

// Log that the job has run
gs.log("Scheduled job 2 has run at " + new GlideDateTime().getDisplayValue(), "ScheduledJob2");`
	}
})
```