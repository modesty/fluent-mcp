```typescript
// Fluent ATF Test
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['test_1_123456'],
  name: 'POST REST Request to Update Incident',
  description: 'Send a POST REST request to update an incident and assert the response status code and response time.',
  active: true,
  failOnServerError: true
}, (atf) => {
  atf.rest.sendRestRequest({
    $id: 'step_1_abcdef',
    path: '/api/now/table/incident/sysId',
    body: `{"short_description": "updated by table API"}`,
    mutualAuth: "1844241ec2c57afb8739f5110ca16bf3",
    auth: '',
    basicAuthentication: "5e6ce4b04f021210c0338ef0b1ce0b1f",
    method: 'post',
    queryParameters: {},
    headers: {}
  })
  atf.rest.assertStatusCode({
    $id: 'step_2_ghijkl',
    operation: 'equals',
    statusCode: 200
  })
  atf.rest.assertResponseTime({
    $id: 'step_3_mnopqr',
    operation: 'less_than',
    responseTime: 1000
  })
})
```
