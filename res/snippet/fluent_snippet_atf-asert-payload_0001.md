```typescript
// Fluent ATF Test
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['test_1_123456'],
  name: 'REST API Test for Scaffold',
  description: 'Test to send a GET request to the scaffold API and validate the response',
  active: true,
  failOnServerError: true
}, (atf) => {
  atf.rest.sendRestRequest({
    $id: 'step_1_abcdef',
    path: '/api/now/fluent/scaffold',
    body: '',
    mutualAuth: "1844241ec2c57afb8739f5110ca16bf3",
    auth: '',
    basicAuthentication: "5e6ce4b04f021210c0338ef0b1ce0b1f",
    method: 'get',
    queryParameters: { new: 'true' },
    headers: {}
  })
  atf.rest.assertResponseJSONPayloadIsValid({
    $id: 'step_2_ghijkl'
  })
  atf.rest.assertJsonResponsePayloadElement({
    $id: 'step_3_mnopqr',
    elementName: 'result',
    operation: 'equals',
    elementValue: 'success'
  })
  atf.rest.assertStatusCodeName({
    $id: 'step_4_stuvwx',
    operation: 'equals',
    codeName: 'OK'
  })
})
```
