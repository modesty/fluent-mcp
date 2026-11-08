```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

Test({
    $id: Now.ID['atf-form-action_0003'], // fill in a valid GUID string or the name of the test
    name: 'Incident Form Test', // string
    description: 'Test for Incident form submission and validation', // string
    active: true, // boolean
    failOnServerError: true // boolean
}, (atf) => {
    atf.server.impersonate({
        $id: Now.ID['0001'], 
        user: 'cae9ddbedbd313001d47765f369619bd', // sys_id | Record<'sys_user'>: the user's sys_id, looked up on the instance
    })
    // openExistingRecord takes a sys_id, not a number: look the incident up first
    const incidentQuery = atf.server.recordQuery({
        $id: Now.ID['0002'],
        table: 'incident',
        fieldValues: 'number=INC0009005', // string, servicenow encoded query
        enforceSecurity: true, // boolean
        assert: 'records_match_query' // 'records_match_query' | 'no_records_match_query'
    })
    atf.form.openExistingRecord({
        $id: Now.ID['0003'],
        table: 'incident', 
        recordId: incidentQuery.first_record, // sys_id of the record: input camelCase, output snake_case
        formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
        view: '', // string
        selectedTabIndex: 0
    })
    atf.form.clickUIAction({
        $id: Now.ID['0004'],
        table: 'incident',
        formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
        actionType: 'ui_action', // 'ui_action' | 'declarative_action'
        uiAction: '2f43c471c0a8006400a07440e49924c2', // sys_id | Record<'sys_ui_action'>
        declarativeAction: '', // sys_id | Record<'sys_declarative_action_assignment'>
        assert: 'form_submitted_to_server' // 'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
    })
    const outputOfSave = atf.form.clickUIAction({
        $id: Now.ID['0005'],
        table: 'incident', 
        formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
        actionType: 'ui_action', // 'ui_action' | 'declarative_action'
        uiAction: '041881ef2f8d1300a09a839fb18c959b', // sys_id | Record<'sys_ui_action'>
        declarativeAction: '', // sys_id | Record<'sys_declarative_action_assignment'>
        assert: 'form_submitted_to_server' // 'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
    })
    atf.form.fieldValueValidation({
        $id: Now.ID['0006'],
        table: 'incident', 
        conditions: `problem_statement=Email server is down`, // string, servicenow encoded query
        formUI: 'standard_ui' // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
    })
    atf.server.recordValidation({
        $id: Now.ID['0007'],
        table: 'incident',
        fieldValues: 'problem_idISNOTEMPTY', // string, servicenow encoded query: Create Problem linked a problem to the incident
        recordId: outputOfSave.record_id, // sys_id of the saved incident (snake_case output of clickUIAction)
        enforceSecurity: true, // boolean
        assert: 'record_validated' // 'record_validated' | 'record_not_found'
    })
})
```
