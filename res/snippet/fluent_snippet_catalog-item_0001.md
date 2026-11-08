# Laptop request catalog item: published to the IT catalog with hardware category, inline variables for model and delivery date, fulfilled by a Flow, with user criteria restricting ordering to employees

```typescript
import { CatalogItem, Record, Role, VariableSet } from '@servicenow/sdk/core'
import { SingleLineTextVariable, SelectBoxVariable, DateVariable, ReferenceVariable } from '@servicenow/sdk/core'

// Existing platform records (look sys_ids up with: now-sdk query sc_catalog -q 'title=Service Catalog' -f sys_id,title)
const serviceCatalog = 'e0d08b13c3330100c8b837659bba8fb4' // Service Catalog
const hardwareCategory = 'd258b953c611227a0146101fb1be7c31' // Hardware
const laptopFulfillmentFlow = '523da512c611228900811a37c97c2014' // sys_hub_flow that fulfills the request

// Role held by employees who may order hardware
export const laptopRequesterRole = Role({
    $id: Now.ID['laptop_requester_role'],
    name: 'u_laptop_requester',
    description: 'Employees allowed to order laptops',
})

// User criteria: who can see and order the item (availableFor expects user_criteria records)
export const employeeUserCriteria = Record({
    $id: Now.ID['employee_user_criteria'],
    table: 'user_criteria',
    data: {
        name: 'Laptop requesters',
        role: [Now.ref('sys_user_role', { name: 'u_laptop_requester' })], // the Role above, by its coalesce key (resolves to its sys_id)
        active: true,
    },
})

// Reusable variable set attached to the item (e.g. delivery contact)
export const laptopVariableSet = VariableSet({
    $id: Now.ID['laptop_delivery_variable_set'],
    title: 'Laptop Delivery',
    internalName: 'laptop_delivery',
    type: 'singleRow',
    variables: {
        deliver_to: ReferenceVariable({
            question: 'Deliver To',
            referenceTable: 'sys_user',
            order: 100,
            mandatory: true,
        }),
        delivery_location: ReferenceVariable({
            question: 'Delivery Location',
            referenceTable: 'cmn_location',
            order: 200,
        }),
    },
})

export const laptopRequestItem = CatalogItem({
    $id: Now.ID['laptop_request_catalog_item'],
    name: 'Laptop Request',
    shortDescription: 'Request a new laptop for business use',
    description: '<p>Use this form to request a standard business laptop. Manager approval is required. Typical fulfillment time is 3-5 business days.</p>',
    state: 'published',
    order: 100,

    // Publish to the Service Catalog under the Hardware category (categories require catalogs)
    catalogs: [serviceCatalog],
    categories: [hardwareCategory],

    // Fulfill via Flow
    flow: laptopFulfillmentFlow,
    fulfillmentAutomationLevel: 'fullyAutomated',

    // Inline variables for this item
    variables: {
        laptop_model: SelectBoxVariable({
            question: 'Laptop Model',
            order: 100,
            mandatory: true,
            choices: {
                standard: { label: 'Standard Laptop', sequence: 1 },
                developer: { label: 'Developer Workstation', sequence: 2 },
            },
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

    // Attach the reusable variable set
    variableSets: [
        { variableSet: laptopVariableSet, order: 400 },
    ],

    // Access control: only users matching the user criteria can order
    availableFor: [employeeUserCriteria],

    // Portal settings
    requestMethod: 'order',
    hideSaveAsDraft: false,
    mandatoryAttachment: false,
    deliveryTime: { days: 5 }, // plain Duration object; the Duration() helper is for Record() data

    // Pricing
    cost: 0,
    ignorePrice: true,
})
```
