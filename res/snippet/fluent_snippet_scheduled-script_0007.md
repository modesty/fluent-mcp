# Scheduled Job API example: modifying what the Scheduled Script Execution does by updating its script to log "Hello from Fluent Scheduled Job"

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
	$id: Now.ID['scheduledscript7'],
	table: 'sysauto_script',
	data: {
		name: 'Daily Hello Job',
		active: true,
		conditional: false,
		run_type: 'daily',
		time_zone: 'US/Pacific',
		run_time: '2025-03-13 08:00:00',
		script: get_glide_script(
			'sysauto_script',
			'Update script info message to Hello from Fluent Scheduled Job',
			'sn_cs.VASystemObject.generateEmailNotifications();'
		)
	}
});
```