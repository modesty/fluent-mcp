// Opens a new form for the selected table and FormUI.
atf.form.openNewForm({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace',
  view: '', // string
});

// Opens an existing record for the selected table and FormUI
// follow this step after a submitForm step to open the record that was just created
atf.form.openExistingRecord({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  recordId: '', // sys_id of the record
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace' 
  view: '', // string
  selectedTabIndex: 1
});

// Submits the current form.
atf.form.submitForm({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  assert: '', // '' | 'form_submitted_to_server' | 'form_submission_canceled_in_browser'
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
});

// Clicks a button within a modal in the specified Form UI
atf.form.clickModalButton({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  uiPage: get_sys_id('sys_ui_page', ''), // sys_id of Record&lt;'sys_ui_page'&gt;
  button: '', // button name
  assert: '', // '' | 'page_not_reloaded' | 'modal_not_closed' | 'page_reloaded'
  assertTimeout: 10, // seconds to wait for pass or fail after the button clickable
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
  action: 'confirm', //'confirm' | 'cancel'
  values: '', // string, optional — field values for workspace UI
});

// Sets field values on the current form after a call to atf.form.openNewForm or atf.form.openExistingRecord
atf.form.setFieldValue({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values: { "field_one": "value1", "field_two": "value2" }
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
});

// Validates field values on the current form after a call to atf.form.openNewForm or atf.form.openExistingRecord
atf.form.fieldValueValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  conditions: '', // servicenow encoded query
  formUI: 'standard_ui' // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace' 
})

// Clicks a UI Action button on the current form and asserts the form submission results
atf.form.clickUIAction({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
  actionType: '', // 'ui_action' | 'declarative_action'
  uiAction: get_sys_id('sys_ui_action', ''), // sys_id | Record&lt;'sys_ui_action'&gt;
  declarativeAction: get_sys_id('sys_declarative_action_assignment', ''), // sys_id | Record&lt;'sys_declarative_action_assignment'&gt;
  assert: 'form_submitted_to_server', // 'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
})
