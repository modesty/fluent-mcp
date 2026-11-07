# validate catalog item price and recurring price, then validate condition variable is true

```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID[''], // fill in a valid GUID string or the name of the test
  name: 'Validate Price and Recurring Price', // string
  description: 'Test to validate the price and recurring price of a catalog item', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  atf.catalog.validatePriceAndRecurringPrice({
    $id: Now.ID['001'],
    price: '100', // number | string
    recurringPrice: '10', // number | string
    frequency: 'monthly', // '' | 'weekly' | 'quarterly' | 'weekly2' | 'semiannual' | 'monthly' | 'yearly' | 'daily' | 'monthly2'
  })

  atf.catalog.validateVariableValue({
    $id: Now.ID['002'], // string | guid, mandatory
    catalogItem: Now.ref('sc_cat_item', '<sys_id>'), // sys_id | Record<'sc_cat_item'>; the iPhone item's sys_id, looked up on the instance
    catalogConditions: "IO:<sys_id of the condition variable>=true" // string of variable sys_ids and the value to validate. If multiple, each has 'IO:' before and joined with ^, example: "IO:<item_option_new sys_id>=true^IO:<item_option_new sys_id>LIKEnone"
  }): void;

})
```
