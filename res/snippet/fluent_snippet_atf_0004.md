```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID[''], // fill in a valid GUID string or the name of the test
  name: 'Create Emergency Change from an Incident', // string
  description: 'Test to create an Emergency Change from an Incident', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  atf.server.impersonate({
    user: 'cae9ddbedbd313001d47765f369619bd',
  })

  const insertedIncident = atf.server.recordInsert({
    table: 'incident',
    fieldValues: {
      'short_description': 'Database server is down',
      'caller_id': '77ad8176731313005754660c4cf6a7de'
    },
    assertType: 'record_successfully_inserted',
    enforceSecurity: false,
  })

  atf.form.openExistingRecord({
    table: 'incident',
    recordId: insertedIncident.record_id,
    formUI: 'standard_ui',
    view: '',
    selectedTabIndex: 0,
  })

  atf.form.clickUIAction({
    table: 'incident',
    formUI: 'standard_ui',
    actionType: 'ui_action',
    uiAction: '728aad41c30202003d2ae219cdba8fcd',
    declarativeAction: '',
    assertType: 'form_submitted_to_server',
  })

  atf.form.clickUIAction({
    table: 'incident',
    formUI: 'standard_ui',
    actionType: 'ui_action',
    uiAction: '041881ef2f8d1300a09a839fb18c959b',
    declarativeAction: '',
    assertType: 'form_submitted_to_server',
  })

  atf.form.fieldValueValidation({
    table: 'incident',
    conditions: `short_description=Database server is down`,
    formUI: 'standard_ui',
  })
})
```
