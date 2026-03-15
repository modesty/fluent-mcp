# Catalog UI policy that makes the "Manager Approval Reason" variable mandatory and visible only when the "Needs Urgent Approval" checkbox is checked

```typescript
import { CatalogUiPolicy } from '@servicenow/sdk/core'
import { laptopRequestItem } from './laptop-request-item.now'
import { laptopVariableSet } from './laptop-variable-set.now'

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

    // Condition: the 'urgent_approval' checkbox variable is checked
    catalogCondition: `${laptopVariableSet.variables.urgent_approval} == 'true'`,

    appliesOnCatalogItemView: true,

    actions: [
        {
            variableName: laptopVariableSet.variables.approval_reason,
            visible: true,
            mandatory: true,
            readOnly: false,
            order: 100,
        },
        {
            variableName: laptopVariableSet.variables.manager_email,
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

    catalogCondition: `${laptopVariableSet.variables.employee_type} === 'contractor'`,

    appliesOnCatalogItemView: true,

    actions: [
        {
            variableName: laptopVariableSet.variables.corporate_card_number,
            visible: false,
            mandatory: false,
            order: 100,
        },
    ],
})
```
