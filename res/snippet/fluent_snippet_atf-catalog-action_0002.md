# Open a catalog item and add it to the shopping cart using ATF in ServiceNow
```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['atf-catalog-action_0002'], // fill in a valid GUID string or the name of the test
  name: 'Add item to shopping cart', // string
  description: 'Test to add a catalog item to the shopping cart', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  atf.catalog.openCatalogItem({
    $id: Now.ID['001'], // string | guid, mandatory
    catalogItem: "91edb87273221010c84e2bb43cf6a7ae" // sys_id | Record<'sc_cat_item'>
  });

  atf.catalog.setCatalogItemQuantity({
    $id: Now.ID['002'], 
    quantity: '5' // number | string
  });

  atf.catalog.orderCatalogItem({
    $id: Now.ID['003'], // string | guid, mandatory
    assertType: 'form_submitted_to_server' // 'form_submitted_to_server' |'form_submission_cancelled_in_browser'
  })

})
```
