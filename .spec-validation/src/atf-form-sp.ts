// Opens a new form for the selected table in Service Portal.
atf.form_SP.openNewForm({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  view: '', // string
});

// Navigates to a Service Portal page.
atf.form_SP.openServicePortalPage({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  pageId: '', // string, the sys_id or URL suffix of the Service Portal page
});

// Sets a field value on the current Service Portal form after a call to atf.form_SP.openNewForm.
atf.form_SP.setFieldValue({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values: { "field_one": "value1", "field_two": "value2" }
});

// Validates that a field value matches expected conditions on the current Service Portal form.
atf.form_SP.fieldValueValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  conditions: '', // string, servicenow encoded query
});

// Validates field states (mandatory, read-only, visible) on the current Service Portal form.
atf.form_SP.fieldStateValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  fieldName: '', // string, the field name to validate
  isMandatory: false, // boolean
  isReadOnly: false, // boolean
  isVisible: true, // boolean
});

// Validates the visibility of a UI action on the current Service Portal form.
atf.form_SP.uiActionVisibilityValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  uiAction: get_sys_id('sys_ui_action', ''), // sys_id | Record<'sys_ui_action'>
  isVisible: true, // boolean
});

// Adds attachments to the current Service Portal form.
atf.form_SP.addAttachmentsToForm({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  attachments: [], // array of attachment objects
});

// Submits the current Service Portal form.
atf.form_SP.submitForm({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  assert: '', // '' | 'form_submitted_to_server' | 'form_submission_canceled_in_browser'
});

// Clicks a UI action button on the current Service Portal form.
atf.form_SP.clickUIAction({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  uiAction: get_sys_id('sys_ui_action', ''), // sys_id | Record<'sys_ui_action'>
  assert: 'form_submitted_to_server', // 'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
});
