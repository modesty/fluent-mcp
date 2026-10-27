```typescript
// Fluent ATF Test
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['test_1_a1b2c3'],
  name: 'Checkout and Replay Empty Shopping Cart',
  description: 'Test to checkout an empty shopping cart and replay the request, then log a message.',
  active: true,
  failOnServerError: true
}, (atf) => {
  // A dedicated requester, never a hard-coded admin sys_id; createUser impersonates it by default.
  const requester = atf.server.createUser({
    $id: 'step_0_requester',
    firstName: 'ATF',
    lastName: 'Requester',
  })
  // checkoutShoppingCart outputs `request_id` (an sc_request); replayRequestItem needs an sc_req_item,
  // so the two are not chained — replay a known request item instead.
  const checkoutResult = atf.server.checkoutShoppingCart({
    $id: 'step_1_d4e5f6',
    assert: 'empty_cart',
    requestedFor: requester.user,
    deliveryAddress: '123 main st',
    specialInstructions: 'none',
  })
  atf.server.replayRequestItem({
    $id: 'step_2_g7h8i9',
    request_item: "aeed229047801200e0ef563dbb9a71c2", // snake_case INPUT; sys_id of an existing sc_req_item - look it up on
    // the instance (e.g. query_fluent_records on sc_req_item) and replace this value
  })
  atf.server.log({
    $id: 'step_3_j0k1l2',
    log: `empty cart checked out (request: ${checkoutResult.request_id}); request item replayed`
  })
})
```
