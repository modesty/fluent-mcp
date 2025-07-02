```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

Test({
    $id: Now.ID[''], // fill in a valid GUID string or the name of the test
    name: 'Incident Form Test', // string
    description: 'Test for Incident form submission and validation', // string
    active: true, // boolean
    failOnServerError: true // boolean
}, (atf) => {
    atf.server.impersonate({
        $id: Now.ID['0001'], 
        user: 'cae9ddbedbd313001d47765f369619bd', // function get_sys_id has two parameters: table name and encoded query string
    })
    atf.form.openExistingRecord({
        $id: Now.ID['0002'],
        table: 'incident', // function get_table_name has one parameter: table name hints
        recordId: 'INC0009005', // sys_id of the record
        formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
        view: '', // string
        selectedTabIndex: 0
    })
    const outputOfCreateProblem = atf.form.clickUIAction({
        $id: Now.ID['0003'],
        table: 'incident', // function get_table_name has one parameter: table name hints
        formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
        actionType: 'ui_action', // 'ui_action' | 'declarative_action'
        uiAction: '2f43c471c0a8006400a07440e49924c2', // sys_id | Record<'sys_ui_action'>
        declarativeAction: '', // sys_id | Record<'sys_declarative_action_assignment'>
        assertType: 'form_submitted_to_server' // 'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
    })
    const outputOfSave = atf.form.clickUIAction({
        $id: Now.ID['0004'],
        table: 'incident', // function get_table_name has one parameter: table name hints
        formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
        actionType: 'ui_action', // 'ui_action' | 'declarative_action'
        uiAction: '041881ef2f8d1300a09a839fb18c959b', // sys_id | Record<'sys_ui_action'>
        declarativeAction: '', // sys_id | Record<'sys_declarative_action_assignment'>
        assertType: 'form_submitted_to_server' // 'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
    })
    atf.form.fieldValueValidation({
        $id: Now.ID['0005'],
        table: 'incident', // function resolve_table_fields has one parameter: table name hints
        conditions: `problem_statement=Email server is down`, // string, servicenow encoded query
        formUI: 'standard_ui' // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
    })
    atf.server.recordValidation({
        $id: Now.ID['0006'],
        table: 'incident', // function resolve_table_fields has one parameter: table name hints
        fieldValues: `problem_id=${outputOfCreateProblem.record_id}`, // string, servicenow encoded query
        recordId: outputOfSave.record_id, // sys_id of the record
        enforceSecurity: false, // boolean
        assertType: 'record_validated' // 'record_validated' | 'record_not_found'
    })
})
```
