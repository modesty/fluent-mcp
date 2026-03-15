# Laptop request catalog item: published to the IT catalog with hardware category, inline variables for model and delivery date, fulfilled by a Flow, with user criteria restricting ordering to employees

```typescript
import { CatalogItem, Role } from '@servicenow/sdk/core'
import { SingleLineTextVariable, SelectBoxVariable, DateVariable, ReferenceVariable } from '@servicenow/sdk/core'
import { laptopFulfillmentFlow } from './laptop-fulfillment-flow.now'
import { employeeUserCriteria } from './user-criteria.now'
import { laptopVariableSet } from './laptop-variable-set.now'

export const laptopRequestItem = CatalogItem({
    $id: Now.ID['laptop_request_catalog_item'],
    name: 'Laptop Request',
    shortDescription: 'Request a new laptop for business use',
    description: '<p>Use this form to request a standard business laptop. Manager approval is required. Typical fulfillment time is 3-5 business days.</p>',
    state: 'published',
    order: 100,

    // Publish to IT catalog under Hardware category
    catalogs: [{ $id: '', table: 'sc_catalog', sys_id: 'e0d08b13c3330100c8b837659bba8fb4' }], // Service Catalog
    categories: [{ $id: '', table: 'sc_category', sys_id: 'a9d0cb5ac0a8016b00af2e8dbcba3a6f' }], // Hardware

    // Fulfill via Flow
    flow: laptopFulfillmentFlow,
    fulfillmentAutomationLevel: 'fullyAutomated',

    // Inline variables for this item
    variables: {
        laptop_model: SelectBoxVariable({
            question: 'Laptop Model',
            order: 100,
            mandatory: true,
            defaultValue: 'standard',
        }),
        required_by: DateVariable({
            question: 'Required By Date',
            order: 200,
            mandatory: false,
        }),
        justification: SingleLineTextVariable({
            question: 'Business Justification',
            order: 300,
            mandatory: true,
            helpText: 'Explain why you need a new laptop',
        }),
    },

    // Attach reusable variable set (e.g. contact info)
    variableSets: [
        { variableSet: laptopVariableSet, order: 400 },
    ],

    // Access control
    availableFor: [employeeUserCriteria],

    // Portal settings
    requestMethod: 'order',
    hideSaveAsDraft: false,
    mandatoryAttachment: false,
    deliveryTime: Duration({ days: 5 }),

    // Pricing
    cost: 0,
    ignorePrice: true,
})
```
