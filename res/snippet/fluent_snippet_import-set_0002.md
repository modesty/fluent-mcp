# ImportSet API example: import set with coalesce, choice actions, and date formats
```typescript
import { ImportSet } from '@servicenow/sdk/core'

ImportSet({
	$id: Now.ID['incident_import_transform'],
	name: 'Incident Import Transform',
	targetTable: 'incident',
	sourceTable: 'u_incident_staging',
	active: true,
	order: 100,
	enforceMandatoryFields: 'onlyMappedFields',
	createOnEmptyCoalesce: true,
	copyEmptyFields: false,
	fields: {
		number: {
			sourceField: 'u_incident_number',
			coalesce: true,
			coalesceCaseSensitive: false,
		},
		short_description: 'u_summary',
		description: 'u_details',
		priority: {
			sourceField: 'u_priority',
			choiceAction: 'reject',
		},
		category: {
			sourceField: 'u_category',
			choiceAction: 'create',
		},
		opened_at: {
			sourceField: 'u_opened_date',
			dateFormat: 'yyyy-MM-dd HH:mm:ss',
		},
		caller_id: {
			sourceField: 'u_caller_email',
			referenceValueField: 'email',
		},
	},
})
```
