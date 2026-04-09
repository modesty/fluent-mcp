#**Context:** This chunk details APIs used in the ServiceNow Automated Test Framework (ATF) for testing form interactions within a Service Portal environment. It includes methods for opening new or existing forms, setting and validating field values, validating field states and UI action visibility, submitting forms, clicking UI actions, and adding attachments. Use these APIs when testing Service Portal form behavior.
```typescript
// Opens a new form for the selected table in Service Portal.
atf.form_SP.openNewForm({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  view: '', // string
}): void;

// Navigates to a Service Portal page.
atf.form_SP.openServicePortalPage({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  pageId: '', // string, the sys_id or URL suffix of the Service Portal page
}): void;

// Sets a field value on the current Service Portal form after a call to atf.form_SP.openNewForm.
atf.form_SP.setFieldValue({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values: { "field_one": "value1", "field_two": "value2" }
}): void;

// Validates that a field value matches expected conditions on the current Service Portal form.
atf.form_SP.fieldValueValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  conditions: '', // string, servicenow encoded query
}): void;

// Validates field states (mandatory, read-only, visible) on the current Service Portal form.
atf.form_SP.fieldStateValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  fieldName: '', // string, the field name to validate
  isMandatory: false, // boolean
  isReadOnly: false, // boolean
  isVisible: true, // boolean
}): void;

// Validates the visibility of a UI action on the current Service Portal form.
atf.form_SP.uiActionVisibilityValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  uiAction: get_sys_id('sys_ui_action', ''), // sys_id | Record<'sys_ui_action'>
  isVisible: true, // boolean
}): void;

// Adds attachments to the current Service Portal form.
atf.form_SP.addAttachmentsToForm({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  attachments: [], // array of attachment objects
}): void;

// Submits the current Service Portal form.
atf.form_SP.submitForm({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  assert: '', // '' | 'form_submitted_to_server' | 'form_submission_canceled_in_browser'
}): { table: string; recordId: string };

// Clicks a UI action button on the current Service Portal form.
atf.form_SP.clickUIAction({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  uiAction: get_sys_id('sys_ui_action', ''), // sys_id | Record<'sys_ui_action'>
  assert: 'form_submitted_to_server', // 'form_submitted_to_server' | 'form_submission_canceled_in_browser' | 'page_reloaded_or_redirected'
}): { recordId: string; table: string };

```
