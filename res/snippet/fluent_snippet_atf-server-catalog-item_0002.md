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
  const checkoutResult = atf.server.checkoutShoppingCart({
    $id: 'step_1_d4e5f6',
    assert: 'empty_cart',
    requestedFor: "6816f79cc0a8016401c5a33be04be441",
    deliveryAddress: '123 main st',
    specialInstructions: 'none',
  })
  atf.server.replayRequestItem({
    $id: 'step_2_g7h8i9',
    requestItem: checkoutResult.requestId,
  })
  atf.server.log({
    $id: 'step_3_j0k1l2',
    log: 'empty cart is checked out and replayed'
  })
})
```
