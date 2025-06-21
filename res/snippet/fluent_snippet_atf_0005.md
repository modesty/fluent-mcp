```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID[''], // fill in a valid GUID string or the name of the test
  name: 'Cancel Change Request For Normal type', // string
  description: 'Test to cancel a Change Request of Normal type before review state', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  atf.server.impersonate({
    user: 'b6b364e253131300e321ddeeff7b121b', // Impersonate the user 'ATF Change Management'
  })

  const insertedRecord = atf.server.recordInsert({
    table: 'change_request', // Insert a record into 'change_request'
    fieldValues: {
      'type': 'Normal',
      'short_description': 'Cancel Change before review state for Normal type',
      'assignment_group': '679434f053231300e321ddeeff7b12d8',
      'state': 'Assess'
    },
    assertType: 'record_successfully_inserted',
    enforceSecurity: false
  })

  atf.form.openExistingRecord({
    table: 'change_request', // Open the 'Change Request' form
    recordId: insertedRecord.record_id,
    formUI: 'standard_ui',
    view: '',
    selectedTabIndex: 0
  })

  atf.form.clickUIAction({
    table: 'change_request', // Click UI Action 'Cancel Change'
    formUI: 'standard_ui',
    actionType: 'ui_action',
    uiAction: '4f2777b3cb100200d71cb9c0c24c9c91',
    declarativeAction: '',
    assertType: 'form_submitted_to_server'
  })

  atf.form.setFieldValue({
    table: 'change_request', // Set the components on the page
    fieldValues: {
      'textarea': 'Invalid' // 'Textarea <textarea>: Reason' = 'Invalid'
    },
    formUI: 'standard_ui'
  })

  atf.form.clickModalButton({
    formUI: 'standard_ui', // Click the ok button
    uiPage: '06a7db02b7703300fecf082e7e11a9e8',
    assertType: '',
    button: 'ok',
    assertTimeout: 10
  })

  atf.form.fieldValueValidation({
    table: 'change_request', // Validate that form matches the condition 'state' = 'Canceled'
    conditions: 'state=Canceled',
    formUI: 'standard_ui'
  })
})
```
