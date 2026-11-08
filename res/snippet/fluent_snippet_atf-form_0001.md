```typescript
// Fluent ATF Test
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['incident_reference_field_validation'],
  name: 'Incident Reference Field Validation',
  description: 'Test to validate setting a reference field on an incident form',
  active: true,
  failOnServerError: true
}, (atf) => {
  atf.form.openNewForm({
    $id: 'step_1_123456',
    table: "incident",
    formUI: 'standard_ui',
    view: ''
  })
  atf.form.setFieldValue({
    $id: 'step_2_654321',
    table: "incident",
    fieldValues: { "caller_id": "77ad8176731313005754660c4cf6a7de" }, // reference field: the sys_id of a sys_user record
    formUI: 'standard_ui'
  })
  const outputOfSubmit = atf.form.submitForm({
    $id: 'step_3_abcdef',
    assert: 'form_submitted_to_server',
    formUI: 'standard_ui'
  })
  atf.form.openExistingRecord({
    $id: 'step_4_fedcba',
    table: "incident",
    recordId: outputOfSubmit.record_id, // submitForm output is snake_case record_id
    formUI: 'cmdb_workspace',
    view: '',
    selectedTabIndex: 0
  })
})
```
