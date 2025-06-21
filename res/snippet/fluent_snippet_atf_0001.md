```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID[''], // fill in a valid GUID string or the name of the test
  name: 'Add item to shopping cart', // string
  description: 'Test to add a catalog item to the shopping cart', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  atf.catalog.openCatalogItem({
    catalogItem: '1e01f08ac0a801070187b08d81c0845c' // sys_id of the catalog item to open
  })
  atf.catalog.addItemToShoppingCart({
    assert: 'form_submitted_to_server'
  })
})
```