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
		script: get_glide_script(
			'sysauto_script', 
			'update inline script to log a message of "started scheduled job six" using glide system (gs) api: gs.log("ran scheduled job 6");', 
			''
		)
	}
})
```