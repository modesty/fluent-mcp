// Validates whether a declarative action is visible on the current form
atf.form.declarativeActionVisibility({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  formUI: '', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
  visible: [get_sys_id('sys_declarative_action_assignment', '')], // Array of (sys_id | Record&lt;'sys_declarative_action_assignment'&gt;)
  notVisible: [get_sys_id('sys_declarative_action_assignment', '')], // Array of (sys_id | Record&lt;'sys_declarative_action_assignment'&gt;)
});

// Clicks a declarative action on the current form.
atf.form.clickDeclarativeAction({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  declarativeAction: get_sys_id('sys_declarative_action_assignment', ''), // sys_id | Record&lt;'sys_declarative_action_assignment'&gt;
  assert: 'form_submitted_to_server', //'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
})