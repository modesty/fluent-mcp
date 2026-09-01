# Group ATF tests into a nested test suite in ServiceNow Fluent

```typescript
import { Test, TestSuite } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// Author the tests first — TestSuite only groups existing Test() records, it never defines steps.
const loginTest = Test({ $id: Now.ID['suite_login_test'], name: 'User can log in' }, (atf) => {
  atf.server.log({ $id: Now.ID['suite_log_login'], log: 'Checking login' })
})

const checkoutTest = Test({ $id: Now.ID['suite_checkout_test'], name: 'User can check out' }, (atf) => {
  atf.server.log({ $id: Now.ID['suite_log_checkout'], log: 'Checking checkout' })
})

// A suite with no `tests` is a valid container for other suites to nest under.
const regressionSuite = TestSuite({
  $id: Now.ID['suite_full_regression'],
  name: 'Full Regression',
  description: 'Umbrella suite; membership comes from the nested suites below',
})

// Run order is array position — loginTest first, then checkoutTest. No authored order field.
TestSuite({
  $id: Now.ID['suite_smoke'],
  name: 'Smoke Suite',
  description: 'Fast gate for the checkout journey',
  parent: regressionSuite, // must already be declared above (declare-before-use rules out cycles)
  tests: [
    // Object form, used only because this entry needs an override: if login fails, the rest of the
    // suite is pointless. Note the standard runner honours this; ATF's cloud/parallel runner ignores it.
    { test: loginTest, abortOnFailure: true },

    // Bare reference — the default form. Runs with abortOnFailure: false.
    checkoutTest,
  ],
  // Deliberately NOT setting `testFilter` as well: dynamic and static membership conflict, because
  // ATF re-syncs from the filter every time the suite is saved on the instance.
})
```
