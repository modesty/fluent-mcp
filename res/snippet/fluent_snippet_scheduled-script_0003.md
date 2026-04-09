# Scheduled Script API example: weekly script on Thursdays at 9PM US/Mountain that creates an incident
```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

ScheduledScript({
	$id: Now.ID['scheduledscript3'],
	name: 'weekly scheduled script execution',
	active: true,
	conditional: false,
	frequency: 'weekly',
	daysOfWeek: ['thursday'],
	timeZone: 'US/Mountain',
	executionTime: { hours: 21, minutes: 0, seconds: 0 },
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
gs.log("Created new priority 1 incident with sys_id: " + incidentId, "WeeklyIncidentReport");`
})
```
