# Contact information variable set: a reusable set of contact and requester variables that can be attached to multiple catalog items

```typescript
import { VariableSet } from '@servicenow/sdk/core'
import {
    SingleLineTextVariable,
    MultiLineTextVariable,
    SelectBoxVariable,
    ReferenceVariable,
    CheckboxVariable,
    EmailVariable,
} from '@servicenow/sdk/core'

export const contactInfoVariableSet = VariableSet({
    $id: Now.ID['contact_info_variable_set'],
    title: 'Contact Information',
    internalName: 'contact_information',
    description: 'Standard contact and requester information for catalog items',
    type: 'singleRow',
    layout: '2across',
    displayTitle: true,
    order: 100,

    variables: {
        // Primary contact name (auto-filled from user's profile in client script)
        contact_name: SingleLineTextVariable({
            question: 'Contact Name',
            order: 100,
            mandatory: true,
        }),

        // Contact email for notifications
        contact_email: EmailVariable({
            question: 'Contact Email',
            order: 200,
            mandatory: true,
            helpText: 'Email address for status updates about your request',
        }),

        // Contact phone number
        contact_phone: SingleLineTextVariable({
            question: 'Phone Number',
            order: 300,
            mandatory: false,
        }),

        // Department for cost center tracking
        department: ReferenceVariable({
            question: 'Department',
            referenceTable: 'cmn_department',
            order: 400,
            mandatory: true,
        }),

        // Cost center code
        cost_center: SingleLineTextVariable({
            question: 'Cost Center Code',
            order: 500,
            mandatory: false,
            helpText: 'Your department cost center code for billing',
        }),

        // Whether the request is urgent
        is_urgent: CheckboxVariable({
            question: 'Mark as Urgent',
            order: 600,
            defaultValue: false,
            helpText: 'Check only if this request requires expedited handling',
        }),

        // Urgency justification — shown/required via CatalogUiPolicy when is_urgent is checked
        urgency_reason: MultiLineTextVariable({
            question: 'Urgency Justification',
            order: 700,
            mandatory: false,
            hidden: false,
            helpText: 'Explain why this request is urgent',
        }),
    },
})
```
