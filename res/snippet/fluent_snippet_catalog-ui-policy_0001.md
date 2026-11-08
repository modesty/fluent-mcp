# Catalog UI policy that makes the "Manager Approval Reason" variable mandatory and visible only when the "Needs Urgent Approval" checkbox is checked

```typescript
import { CatalogItem, CatalogUiPolicy } from '@servicenow/sdk/core'
import { CheckboxVariable, EmailVariable, MultiLineTextVariable, SelectBoxVariable, SingleLineTextVariable } from '@servicenow/sdk/core'

// Catalog item the policies attach to (fulfilled by an existing flow; look sys_ids up with now-sdk query)
export const laptopRequestItem = CatalogItem({
    $id: Now.ID['laptop_request_catalog_item'],
    name: 'Laptop Request',
    shortDescription: 'Request a new laptop for business use',
    catalogs: ['e0d08b13c3330100c8b837659bba8fb4'], // Service Catalog
    flow: '523da512c611228900811a37c97c2014', // sys_hub_flow that fulfills the request
    variables: {
        employee_type: SelectBoxVariable({
            question: 'Employee Type',
            order: 100,
            mandatory: true,
            choices: {
                employee: { label: 'Employee', sequence: 1 },
                contractor: { label: 'Contractor', sequence: 2 },
            },
        }),
        corporate_card_number: SingleLineTextVariable({ question: 'Corporate Card Number', order: 200 }),
        urgent_approval: CheckboxVariable({ question: 'Needs Urgent Approval', order: 300 }),
        approval_reason: MultiLineTextVariable({ question: 'Manager Approval Reason', order: 400 }),
        manager_email: EmailVariable({ question: 'Manager Email', order: 500 }),
    },
})

// Policy: when 'urgent_approval' is checked, make 'approval_reason' mandatory and visible
export const urgentApprovalPolicy = CatalogUiPolicy({
    $id: Now.ID['laptop_urgent_approval_policy'],
    shortDescription: 'Require approval reason when urgent approval is needed',
    description: 'If the user checks "Needs Urgent Approval", the Approval Reason field becomes required',

    catalogItem: laptopRequestItem,
    appliesTo: 'item',

    active: true,
    onLoad: true,                // evaluate on form load as well as on field changes
    reverseIfFalse: true,        // restore defaults when condition is false

    // Condition (encoded query ending in ^EQ): the 'urgent_approval' checkbox variable is checked
    catalogCondition: `${laptopRequestItem.variables.urgent_approval}=true^EQ`,

    appliesOnCatalogItemView: true,

    actions: [
        {
            variableName: laptopRequestItem.variables.approval_reason,
            visible: true,
            mandatory: true,
            readOnly: false,
            order: 100,
        },
        {
            variableName: laptopRequestItem.variables.manager_email,
            visible: true,
            mandatory: true,
            order: 200,
        },
    ],
})

// Policy: hide the "Corporate Card" field for contractors (non-employees)
export const contractorFieldPolicy = CatalogUiPolicy({
    $id: Now.ID['laptop_contractor_field_policy'],
    shortDescription: 'Hide corporate card field for contractors',

    catalogItem: laptopRequestItem,
    appliesTo: 'item',

    active: true,
    onLoad: true,
    reverseIfFalse: true,

    catalogCondition: `${laptopRequestItem.variables.employee_type}=contractor^EQ`,

    appliesOnCatalogItemView: true,

    actions: [
        {
            variableName: laptopRequestItem.variables.corporate_card_number,
            visible: false,
            mandatory: false,
            order: 100,
        },
    ],
})
```
