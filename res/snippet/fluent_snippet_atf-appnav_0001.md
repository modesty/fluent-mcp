# verify visibility of application in left navigation bar at least has ATF

```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['atf-appnav-test_0001'], // fill in a valid GUID string or the name of the test
  name: 'Navigate to Update Jobs module', // string
  description: 'Test to navigate to the Update Jobs module as if a user had clicked on it', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  atf.applicationNavigator.navigateToModule({
    $id: Now.ID['001'], // string | guid, mandatory
    module: "03ca5e060b3210104568c15885673a09" // sys_id | Record<'sys_app_module'>
  })
})
```
