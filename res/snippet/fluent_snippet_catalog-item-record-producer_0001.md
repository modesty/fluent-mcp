# Incident record producer: allows users to report IT issues directly from the Service Catalog, creating an incident record with mapped variable values

```typescript
import { CatalogItemRecordProducer } from '@servicenow/sdk/core'
import { SingleLineTextVariable, MultiLineTextVariable, SelectBoxVariable, ReferenceVariable } from '@servicenow/sdk/core'

export const reportIncidentProducer = CatalogItemRecordProducer({
    $id: Now.ID['report_incident_producer'],
    name: 'Report an IT Issue',
    shortDescription: 'Create a new IT incident for technical issues or service outages',
    description: '<p>Use this form to report IT issues, software problems, or service outages. Your request will be routed to the IT support team.</p>',
    table: 'incident',
    state: 'published',
    requestMethod: 'submit',
    redirectUrl: 'generatedRecord',

    catalogs: [{ $id: '', table: 'sc_catalog', sys_id: 'e0d08b13c3330100c8b837659bba8fb4' }],
    categories: [{ $id: '', table: 'sc_category', sys_id: '5c7eb61bc0a8010e00e1d5d0af9b2c93' }], // IT

    variables: {
        issue_title: SingleLineTextVariable({
            question: 'Brief Description of the Issue',
            order: 100,
            mandatory: true,
            helpText: 'Summarize the issue in one sentence',
        }),
        issue_description: MultiLineTextVariable({
            question: 'Detailed Description',
            order: 200,
            mandatory: true,
            helpText: 'Include steps to reproduce, error messages, and when the issue started',
        }),
        urgency: SelectBoxVariable({
            question: 'How urgently do you need this resolved?',
            order: 300,
            mandatory: true,
            defaultValue: '3',
        }),
        affected_ci: ReferenceVariable({
            question: 'Affected System or Application (if known)',
            referenceTable: 'cmdb_ci',
            order: 400,
            mandatory: false,
        }),
    },

    // Map catalog variables to incident fields before insert
    script: `
        current.short_description = producer.issue_title;
        current.description = producer.issue_description;
        current.urgency = producer.urgency;
        current.cmdb_ci = producer.affected_ci;
        current.category = 'software';
        current.contact_type = 'self-service';
    `,

    // Add work note after creation
    postInsertScript: `
        current.work_notes = 'Incident created via Service Catalog self-service portal.';
        current.update();
    `,

    hideSaveAsDraft: false,
    hideAttachment: false,
})
```
