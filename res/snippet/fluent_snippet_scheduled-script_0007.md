# Scheduled Script API example: daily Hello job at 8AM US/Pacific
```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
	$id: Now.ID['scheduledscript7'],
	name: 'Daily Hello Job',
	active: true,
	conditional: false,
	frequency: 'daily',
	timeZone: 'US/Pacific',
	executionTime: { hours: 8, minutes: 0, seconds: 0 },
	script: `// Display info message
gs.info("Hello from Fluent Scheduled Job");

// Log the execution time
var currentTime = new GlideDateTime();
gs.log("Daily Hello Job executed at " + currentTime.getDisplayValue(), "DailyHelloJob");`
})
```
