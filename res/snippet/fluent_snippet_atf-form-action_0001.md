```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID[''], // fill in a valid GUID string or the name of the test
  name: 'Create Outage from Change Request', // string
  description: 'Test to create an outage of type outage from a change request', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  atf.server.impersonate({
    $id: Now.ID['0001'],
    user: 'f8588956937002002dcef157b67ffb98', // Impersonate Change Manager
  })

  const insertedChangeRequest = atf.server.recordInsert({
    $id: Now.ID['0002'],
    table: 'change_request', // Insert into Change Request table
    fieldValues: {
      'type': 'Emergency',
      'assignment_group': 'b85d44954a3623120004689b2d5dd60a',
      'short_description': 'Outage created from change request',
      'unauthorized': 'true'
    },
    assertType: 'record_successfully_inserted',
    enforceSecurity: false
  })

  atf.form.openExistingRecord({
    $id: Now.ID['0003'],
    table: 'change_request', // Open the Change Request record
    recordId: insertedChangeRequest.recordId,
    formUI: 'standard_ui',
    view: '',
    selectedTabIndex: 0
  })

  atf.form.clickUIAction({
    $id: Now.ID['0004'],
    table: 'change_request', // Click UI Action 'Create Outage'
    formUI: 'standard_ui',
    actionType: 'ui_action',
    uiAction: '18edfe530a0006d401d579b8ca27b3f1',
    declarativeAction: '',
    assertType: 'page_reloaded_or_redirected'
  })

  atf.form.fieldValueValidation({
    $id: Now.ID['0005'],
    table: 'change_request', // Validate Short Description
    conditions: `short_description=Outage created from change request`,
    formUI: 'standard_ui'
  })

  atf.form.clickUIAction({
    $id: Now.ID['0006'],
    table: 'change_request', // Click UI Action 'Submit'
    formUI: 'standard_ui',
    actionType: 'ui_action',
    uiAction: '0009ff1e7744111020da364c7d5a9933',
    declarativeAction: '',
    assertType: 'form_submitted_to_server'
  })

  atf.form.fieldValueValidation({
    $id: Now.ID['0007'],
    table: 'change_request', // Validate Unauthorized field
    conditions: `unauthorized=false`,
    formUI: 'standard_ui'
  })
})
```
