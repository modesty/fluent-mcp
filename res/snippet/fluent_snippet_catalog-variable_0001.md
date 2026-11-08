# Examples of commonly used catalog variable types: text, selection, reference, date, and layout variables

```typescript
import {
    SingleLineTextVariable,
    MultiLineTextVariable,
    SelectBoxVariable,
    CheckboxVariable,
    ReferenceVariable,
    DateVariable,
    EmailVariable,
    LabelVariable,
    ContainerStartVariable,
    ContainerEndVariable,
    AttachmentVariable,
    NumericScaleVariable,
    ListCollectorVariable,
    VariableSet,
} from '@servicenow/sdk/core'

// Variables live in the 'variables' object of a VariableSet (as here) or a CatalogItem
export const requestDetailsVariableSet = VariableSet({
    $id: Now.ID['request_details_variable_set'],
    title: 'Request Details',
    internalName: 'request_details',
    variables: {
        // ─── Section header using container ───
        section_header: ContainerStartVariable({
            question: 'Request Details',
            displayTitle: true, // shows the question as the container title (question is required with it)
            layout: '2across',
            order: 100,
        }),

        // ─── Text inputs ───
        full_name: SingleLineTextVariable({
            question: 'Full Name',
            order: 110,
            mandatory: true,
            width: 50,
        }),

        email: EmailVariable({
            question: 'Email Address',
            order: 120,
            mandatory: true,
            width: 50,
            helpText: 'Your work email address',
        }),

        // ─── Dropdown selection ───
        priority_level: SelectBoxVariable({
            question: 'Priority Level',
            order: 130,
            mandatory: true,
            choices: {
                '1': { label: 'High', sequence: 1 },
                '2': { label: 'Medium', sequence: 2 },
                '3': { label: 'Low', sequence: 3 },
            },
            defaultValue: '3',
            width: 50,
        }),

        // ─── Reference to another table ───
        assigned_group: ReferenceVariable({
            question: 'Assignment Group',
            referenceTable: 'sys_user_group',
            order: 140,
            mandatory: false,
            useReferenceQualifier: 'simple',
            referenceQualCondition: 'active=true^type=itil',
            width: 50,
        }),

        // ─── Yes/No checkbox ───
        requires_approval: CheckboxVariable({
            question: 'Requires Manager Approval',
            order: 150,
            defaultValue: false,
            helpText: 'Check if this request needs your manager\'s approval before processing',
        }),

        // ─── Date picker ───
        needed_by: DateVariable({
            question: 'Needed By Date',
            order: 160,
            mandatory: false,
            helpText: 'When do you need this completed by?',
        }),

        // ─── Close container ───
        section_end: ContainerEndVariable({ // takes no question: it only closes the container
            order: 170,
        }),

        // ─── Multi-line description ───
        additional_info: MultiLineTextVariable({
            question: 'Additional Information',
            order: 200,
            mandatory: false,
            helpText: 'Any additional context or requirements',
            width: 100,
        }),

        // ─── File attachment ───
        supporting_docs: AttachmentVariable({
            question: 'Supporting Documentation',
            order: 210,
            mandatory: false,
        }),

        // ─── Satisfaction rating ───
        satisfaction_rating: NumericScaleVariable({
            question: 'How satisfied are you with this service? (1-5)',
            scaleMin: 1,
            scaleMax: 5,
            order: 220,
            mandatory: false,
        }),

        // ─── Multi-select from table ───
        affected_systems: ListCollectorVariable({
            question: 'Affected Systems',
            listTable: 'cmdb_ci', // mandatory: the table the user picks records from
            order: 230,
            mandatory: false,
        }),

        // ─── Static informational label ───
        info_label: LabelVariable({
            question: 'Note: Fields marked with * are required. Allow 3-5 business days for fulfillment.',
            order: 250,
        }),
    },
})
```
