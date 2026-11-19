# Catalog UI policy on a record producer (SDK v4.14.2+): require a business justification when the "Production impact" checkbox is checked

```typescript
import { CatalogItemRecordProducer, CatalogUiPolicy } from '@servicenow/sdk/core'
import { CheckboxVariable, MultiLineTextVariable, SingleLineTextVariable } from '@servicenow/sdk/core'

// Record producer the policy attaches to: creates a change request from the Service Catalog
export const changeRequestProducer = CatalogItemRecordProducer({
    $id: Now.ID['change_request_producer'],
    name: 'Request a Standard Change',
    shortDescription: 'Submit a change request for review',
    table: 'change_request',
    // sys_id of an existing sc_catalog record (look it up with now-sdk query sc_catalog)
    catalogs: ['e0d08b13c3330100c8b837659bba8fb4'], // Service Catalog
    variables: {
        change_summary: SingleLineTextVariable({ question: 'Change summary', order: 100, mandatory: true }),
        production_impact: CheckboxVariable({ question: 'Production impact', order: 200 }),
        business_justification: MultiLineTextVariable({ question: 'Business justification', order: 300 }),
    },
    script: `
        current.short_description = producer.change_summary;
        current.justification = producer.business_justification;
    `,
})

// SDK v4.14.2 widened catalogItem to accept a CatalogItemRecordProducer (a type error before).
// A record producer is a catalog item (sc_cat_item_producer extends sc_cat_item), so appliesTo stays 'item'.
export const productionImpactPolicy = CatalogUiPolicy({
    $id: Now.ID['change_production_impact_policy'],
    shortDescription: 'Require a justification for production-impacting changes',

    catalogItem: changeRequestProducer,
    appliesTo: 'item',

    active: true,
    onLoad: true,
    reverseIfFalse: true,

    catalogCondition: `${changeRequestProducer.variables.production_impact}=true^EQ`,

    appliesOnCatalogItemView: true,

    actions: [
        {
            variableName: changeRequestProducer.variables.business_justification,
            visible: true,
            mandatory: true,
            order: 100,
        },
    ],
})
```
