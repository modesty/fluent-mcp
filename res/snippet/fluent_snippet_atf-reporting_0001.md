
```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['p1_incident_report_test'],
  name: 'P1 Incident Report Visibility Test',
  description: 'Test to open and assert visibility of P1 Incident Report',
  active: true,
  failOnServerError: true
}, (atf) => {
  atf.reporting.reportVisibility({
    $id: 'step_1_123456', // string | guid, mandatory
    report: Now.ref('sys_report', '<sys_id>'), // sys_id | Record<'sys_report'>; the P1 incident report's sys_id, looked up on the instance
    assert: 'can_view_report', // 'can_view_report' | 'cannot_view_report';
  })
  atf.server.log({
    $id: 'step_2_789012',
    log: 'report opened'
  })
})
```
