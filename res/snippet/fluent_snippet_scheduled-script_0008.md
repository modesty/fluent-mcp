# Scheduled Job API example: modifying what the Scheduled Script Execution does by updating its script to set a system property false

```typescript
import { Record } from '@servicenow/sdk/core'

Record({
	$id: Now.ID['scheduledscript8'],
	table: 'sysauto_script',
	data: {
		name: 'Daily Hello Job',
		active: true,
		conditional: false,
		run_type: 'daily',
		time_zone: 'US/Pacific',
		run_time: '2025-01-12 23:23:23',
		script: get_glide_script(
			'sysauto_script',
			'Update script to set system property named test_property to false',
			'sn_cs.VASystemObject.generateEmailNotifications();'
		)
	}
});
```