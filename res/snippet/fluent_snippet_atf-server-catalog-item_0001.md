```typescript
// Fluent ATF Test
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['test_1_123456'],
  name: 'Search and Log iPad Catalog Item',
  description: 'Search for iPad catalog item in the Hardware category and log the found item',
  active: true,
  failOnServerError: true
}, (atf) => {
  const searchResult = atf.server.searchForCatalogItem({
    $id: 'step_1_abcdef',
    searchInPortal: true,
    searchTerm: 'iPad',
    catalog: "",
    category: "651395bc53231300e321ddeeff7b1221",
    assertItem: "060f3afa3731300054b6a3549dbe5d3e",
    assert: 'assert_item_present'
  })
  atf.server.log({
    $id: 'step_2_ghijkl',
    log: `Found catalog item: ${searchResult.catalog_item_id}`
  })
})
```
