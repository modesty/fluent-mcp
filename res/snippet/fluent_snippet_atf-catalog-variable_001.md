
```typescript
// Fluent ATF Test
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

Test({
    $id: Now.ID['Impersonate_and_Create_Incident_Test'],
    name: 'Impersonate and Create Incident Test',
    description: 'Test to impersonate a user, create an incident via Record Producer, and validate form submission.',
    active: true,
    failOnServerError: true
}, (atf) => {
    atf.server.impersonate({
        $id: Now.ID['001'],
        user: "8e578dba731313005754660c4cf6a795",
    })
    atf.catalog.openRecordProducer({
        $id: Now.ID['002'],
        catalogItem: "",
    })
    atf.catalog.setVariableValue({
        $id: Now.ID['003'],
        catalogItem: "",
        variableValues: `IO:"5a33d0ef0a0a0b9b007b906f6c589c57"=1 - High^IO:"3f272c500a0a0b990059c24380a2bc02"=test`
    })
    const outputOfSubmit = atf.catalog.submitRecordProducer({
        $id: Now.ID['004'],
        assert: 'form_submitted_to_server'
    })
    atf.server.impersonate({
        $id: Now.ID['005'],
        user: "bba5cf680b982300cac6c08393673a42",
    })
    atf.form.openExistingRecord({
        $id: Now.ID['006'],
        table: "incident",
        recordId: outputOfSubmit.recordId,
        formUI: 'standard_ui',
        view: '',
        selectedTabIndex: 0
    })
    atf.form.fieldValueValidation({
        $id: Now.ID['007'],
        table: "incident",
        conditions: `priority=3^contact_type=Self-service`,
        formUI: 'standard_ui'
    })
    atf.form.setFieldValue({
        $id: Now.ID['008'],
        table: "incident",
        fieldValues: { "assignment_group": "36c741fa731313005754660c4cf6a70d" },
        formUI: 'standard_ui'
    })
    atf.form.clickUIAction({
        $id: Now.ID['009'],
        table: "incident",
        formUI: 'standard_ui',
        actionType: 'ui_action',
        uiAction: "041881ef2f8d1300a09a839fb18c959b",
        declarativeAction: "0152e2f453922010c5e2ddeeff7b121c",
        assertType: 'form_submitted_to_server'
    })
})
```
