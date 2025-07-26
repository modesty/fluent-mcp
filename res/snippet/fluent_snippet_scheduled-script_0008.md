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
		script: `// Set the system property 'test_property' to false
gs.setProperty("test_property", "false");

// Log the property update
gs.log("System property 'test_property' has been set to 'false'", "PropertyUpdate");

// Add information message for admins
gs.info("Daily job has updated test_property to false");`
	}
});
```