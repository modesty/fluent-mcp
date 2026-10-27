```typescript
// Fluent ATF Test
import { Role, Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// The app role the test user runs with (enforceSecurity stays on, so the user needs real access).
const recordTesterRole = Role({
  name: 'incident_record_test.tester',
  containsRoles: ['itil'],
})

Test({
  $id: Now.ID['incident_record_test'],
  name: 'Incident Record Test',
  description: 'Create, update, and delete an incident as a dedicated test user',
  active: true,
  failOnServerError: true
}, (atf) => {
  // Test as a dedicated user, never as admin: createUser impersonates the new user by default.
  // Pass the Role() record in `roles` - a role NAME string is not resolved.
  atf.server.createUser({
    $id: 'step_1_123456',
    firstName: 'ATF',
    lastName: 'Record Tester',
    roles: [recordTesterRole],
  })
  const newIncident = atf.server.recordInsert({
    $id: 'step_2_abcdef',
    table: "incident",
    fieldValues: {
      "short_description": "Initial description"
    },
    assert: 'record_successfully_inserted',
  })
  atf.server.recordUpdate({
    $id: 'step_3_789abc',
    table: "incident",
    fieldValues: {
      "short_description": "test update field from text2fluent"
    },
    recordId: newIncident.record_id,
    assert: 'record_successfully_updated',
  })
  atf.server.recordDelete({
    $id: 'step_4_def123',
    table: "incident",
    recordId: newIncident.record_id,
    assert: 'record_successfully_deleted',
  })
  atf.server.log({
    $id: 'step_5_456def',
    log: 'record deleted',
  })
})
```
