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
		script: `// Display info message
gs.info("Hello from Fluent Scheduled Job");

// Log the execution time
var currentTime = new GlideDateTime();
gs.log("Daily Hello Job executed at " + currentTime.getDisplayValue(), "DailyHelloJob");`
	}
});
```