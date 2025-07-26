# Scheduled Job API example: creating a new Scheduled Script Execution that runs the beginning of the quarter on the business calendar. This job prints a string into the instance system logs.
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
	$id: Now.ID['scheduledscript5'],
	table: 'sysauto_script',
	data: {
		name: 'quarterly scheduled script execution',
		active: true,
		conditional: false,
		run_type: 'business_calendar_start',
		business_calendar: get_sys_id('business_calendar', 'calendar_name=Quarter^ORlabel=Quarter'),
		script: `// Log the message that the job has started
gs.log("started scheduled job five", "ScheduledJobFive");

// Add an info message
gs.info("ran scheduled job 5");

// Record execution timestamp in a system property
var currentDateTime = new GlideDateTime();
gs.setProperty("last_quarterly_job_run", currentDateTime.getDisplayValue());

// Log the quarter start date
var quarterCal = new GlideCalendarEntry.getStartDate('Quarter', currentDateTime);
gs.log("Quarter start date: " + quarterCal, "QuarterlyJob");`
	}
})
```