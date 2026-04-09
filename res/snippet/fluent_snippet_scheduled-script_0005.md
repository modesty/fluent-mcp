# Scheduled Script API example: quarterly script using business calendar start trigger
```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
	$id: Now.ID['scheduledscript5'],
	name: 'quarterly scheduled script execution',
	active: true,
	conditional: false,
	frequency: 'business_calendar_start',
	businessCalendar: get_sys_id('business_calendar', 'calendar_name=Quarter^ORlabel=Quarter'),
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
})
```
