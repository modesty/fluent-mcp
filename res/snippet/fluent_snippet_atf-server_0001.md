```typescript
// Fluent ATF Test
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['incident_record_test'],
  name: 'Incident Record Test',
  description: 'Test to create, update, and delete an incident record while impersonating admin',
  active: true,
  failOnServerError: true
}, (atf) => {
  atf.server.impersonate({
    $id: 'step_1_123456',
    user: "6816f79cc0a8016401c5a33be04be441",
  })
  const newIncident = atf.server.recordInsert({
    $id: 'step_2_abcdef',
    table: "incident",
    fieldValues: {
      "short_description": "Initial description"
    },
    assert: 'record_successfully_inserted',
    enforceSecurity: false,
  })
  atf.server.recordUpdate({
    $id: 'step_3_789abc',
    table: "incident",
    fieldValues: {
      "short_description": "test update field from text2fluent"
    },
    recordId: newIncident.record_id,
    assert: 'record_successfully_updated',
    enforceSecurity: false,
  })
  atf.server.recordDelete({
    $id: 'step_4_def123',
    table: "incident",
    recordId: newIncident.record_id,
    enforceSecurity: false,
    assert: 'record_successfully_deleted',
  })
  atf.server.log({
    $id: 'step_5_456def',
    log: 'record deleted',
  })
})
```
