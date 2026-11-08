# validate catalog item price and recurring price, then validate condition variable is true

```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['atf-catalog-validation_0001'], // fill in a valid GUID string or the name of the test
  name: 'Validate Price and Recurring Price', // string
  description: 'Test to validate the price and recurring price of a catalog item', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  // Both validation steps need an open catalog item: they run between openCatalogItem and orderCatalogItem
  atf.catalog.openCatalogItem({
    $id: Now.ID['001'], // string | guid, mandatory
    catalogItem: '91edb87273221010c84e2bb43cf6a7ae' // sys_id | Record<'sc_cat_item'>; the catalog item's sys_id, looked up on the instance
  })

  atf.catalog.validatePriceAndRecurringPrice({
    $id: Now.ID['002'],
    price: '100', // number | string
    recurringPrice: '10', // number | string
    frequency: 'monthly', // '' | 'weekly' | 'quarterly' | 'weekly2' | 'semiannual' | 'monthly' | 'yearly' | 'daily' | 'monthly2'
  })

  atf.catalog.validateVariableValue({
    $id: Now.ID['003'], // string | guid, mandatory
    catalogItem: '91edb87273221010c84e2bb43cf6a7ae', // sys_id | Record<'sc_cat_item'>; the same catalog item opened above
    catalogConditions: 'IO:<sys_id of the condition variable>=true' // string of variable sys_ids and the value to validate. If multiple, each has 'IO:' before and joined with ^, example: "IO:<item_option_new sys_id>=true^IO:<item_option_new sys_id>LIKEnone"
  })

})
```
