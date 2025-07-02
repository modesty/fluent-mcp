# Open a catalog item and add it to the shopping cart using ATF in ServiceNow
```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['atf-catalog-action_0001'], // fill in a valid GUID string or the name of the test
  name: 'Add item to shopping cart', // string
  description: 'Test to add a catalog item to the shopping cart', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  atf.catalog.openCatalogItem({
    $id: Now.ID['001'],
    catalogItem: "1e01f08ac0a801070187b08d81c0845c" // Replace 'sample item' with the actual catalog item name or label
  });
  atf.catalog.addItemToShoppingCart({
    $id: Now.ID['002'],
    assert: 'form_submitted_to_server'
  });
})
```
