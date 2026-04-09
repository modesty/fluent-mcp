# Scheduled Script API example: daily job that sets a system property to false
```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
	$id: Now.ID['scheduledscript8'],
	name: 'Daily Hello Job',
	active: true,
	conditional: false,
	frequency: 'daily',
	timeZone: 'US/Pacific',
	executionTime: { hours: 23, minutes: 23, seconds: 23 },
	script: `// Set the system property 'test_property' to false
gs.setProperty("test_property", "false");

// Log the property update
gs.log("System property 'test_property' has been set to 'false'", "PropertyUpdate");

// Add information message for admins
gs.info("Daily job has updated test_property to false");`
})
```
