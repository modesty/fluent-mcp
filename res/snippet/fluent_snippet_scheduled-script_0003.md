# Scheduled Job API example: creating a new Scheduled Script Execution that runs weekly on Thursdays at 9 PM in the US Mountain time zone. This job creates a incident record.
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
	$id: Now.ID['scheduledscript3'],
	table: 'sysauto_script',
	data: {
		name: 'weekly scheduled script execution',
		active: true,
		conditional: false,
		run_type: 'weekly',
		run_dayofweek: 4,
		time_zone: 'US/Mountain',
		run_time: '2025-03-13 21:00:00',
		script: `// Create a new priority 1 incident
var gr = new GlideRecord("incident");
gr.initialize();
gr.setValue("priority", 1);
gr.setValue("short_description", "Weekly Incident Report");
gr.setValue("description", "This is an automatically generated weekly incident report from a scheduled job.");
gr.setValue("impact", "2"); // High impact
gr.setValue("urgency", "1"); // Critical urgency
var incidentId = gr.insert();

// Log the incident creation
gs.log("Created new priority 1 incident with sys_id: " + incidentId, "WeeklyIncidentReport");`,
	}
})
```