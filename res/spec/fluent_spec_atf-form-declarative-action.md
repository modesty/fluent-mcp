#**Context:** This chunk is part of the ServiceNow Automated Test Framework (ATF) API documentation specifically focused on APIs for interacting with declarative actions on forms. These APIs are essential for validating the visibility of declarative actions, performing clicks on these actions, and asserting the results of form submissions. They are used in scenarios where forms within different user interfaces, such as standard UI, service operations workspace, asset workspace, or cmdb workspace, are tested for correct behavior and outcomes associated with declarative actions.
```typescript
// Validates whether a declarative action is visible on the current form
atf.form.declarativeActionVisibility({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  formUI: '', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
  visible: [get_sys_id('sys_declarative_action_assignment', '')], // Array of (sys_id | Record&lt;'sys_declarative_action_assignment'&gt;)
  notVisible: [get_sys_id('sys_declarative_action_assignment', '')], // Array of (sys_id | Record&lt;'sys_declarative_action_assignment'&gt;)
}): void;

// Clicks a declarative action on the current form.
atf.form.clickDeclarativeAction({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  declarativeAction: get_sys_id('sys_declarative_action_assignment', ''), // sys_id | Record&lt;'sys_declarative_action_assignment'&gt;
  assert: 'form_submitted_to_server' //'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
}): { record_id: string; table: string }
```