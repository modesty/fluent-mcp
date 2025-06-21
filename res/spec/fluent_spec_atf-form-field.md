#**Context:** The chunk focuses on ServiceNow Automated Test Framework (ATF) APIs designed for manipulating and validating field values on forms specifically within the Service Portal. These APIs allow for setting and validating field values, as well as assessing field states like visibility and mandatory status, using `atf.form_SP` methods within the context of the Service Portal.
```typescript
// Validates field values on the current form after a call to atf.form.openNewForm or atf.form.openExistingRecord
atf.form.fieldValueValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: get_table_name(''), // table name
  conditions: '', // servicenow encoded query
  formUI: 'standard_ui' // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace' 
}): void

// Sets field values on the current form after a call to atf.form.openNewForm or atf.form.openExistingRecord
atf.form.setFieldValue({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: resolve_table_fields(''), // table name
  fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values: { "field_one": "value1", "field_two": "value2" }
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
}): void;

// Validates states of the desired fields on the current form after a call to atf.form.openNewForm or atf.form.openExistingRecord
atf.form.fieldStateValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: get_table_name(''), // table name
  visible: [''], // array of field names
  notVisible: [''], // array of field names
  readOnly: [''], // array of field names
  notReadOnly: [''], // array of field names
  mandatory: [''], // array of field names
  notMandatory: [''], // array of field names
  formUI: 'standard_ui', // 'standard_ui' | 'service_operations_workspace' | 'asset_workspace' | 'cmdb_workspace'
}): void;

```