// Validates whether a UI Action button is visible or not on the current form.
atf.form.uiActionVisibility({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  formUI: '', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
  visible: [get_sys_id('sys_ui_action', '')], // array of (sys_id | Record&lt;'sys_ui_action'&gt;)
  notVisible: [get_sys_id('sys_ui_action', '')], // array of (sys_id | Record&lt;'sys_ui_action'&gt;)
});

// Clicks a UI Action button on the current form and asserts the form submission results
atf.form.clickUIAction({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  uiAction: get_sys_id('sys_ui_action', ''), // sys_id | Record&lt;'sys_ui_action'&gt;
  assert: 'form_submitted_to_server', // 'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
  actionType: '', // 'ui_action' | 'declarative_action'
  declarativeAction: get_sys_id('sys_declarative_action_assignment', ''), // sys_id | Record&lt;'sys_declarative_action_assignment'&gt;
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
})
