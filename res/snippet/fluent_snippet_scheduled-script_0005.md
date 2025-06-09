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
		script: get_glide_script(
			'sysauto_script', 
			'update inline script to log a message of "started scheduled job five" using glide system (gs) api: gs.log("ran scheduled job 5");',
			''
		)
	}
})
```