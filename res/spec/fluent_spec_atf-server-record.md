#**Context:** This chunk provides APIs within the ServiceNow Automated Test Framework (ATF) for performing server-side record queries, insert, update, delete and validations. These APIs facilitate automated testing by enabling testers to verify the existence of records, update / delete / insert and validate their conditions on the server without involving the user interface. These actions are crucial for ensuring that data integrity and business rules are upheld through backend validations and queries during testing.
```typescript
// Perform a database query to verify if a record matching the conditions set in this step are met
atf.server.recordQuery({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: get_table_name(''), // table name
  fieldValues: '', // string, servicenow encoded query
  enforceSecurity: false, // boolean;
  assert: 'records_match_query', // 'records_match_query' | 'no_records_match_query';
}): { table: string; 
    first_record: string; // sys_id of the first record
};

// Validates that a given record meets the specified conditions on the server-side.
atf.server.recordValidation({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: get_table_name(''), // table name
  fieldValues: '', // string, servicenow encoded query
  recordId: '', // sys_id of the record
  enforceSecurity: false, // boolean
  assert: 'record_validated', // 'record_validated' | 'record_not_found';
}): void;

// Inserts a record into a table. Specify the field values to set on the new record, outputs the table and the sys_id of the new record.
atf.server.recordInsert({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: resolve_table_fields(''), // table name
  fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values, example: { "field_one": "value1", "field_two": "value2" }
  assert: '', // 'record_successfully_inserted' | 'record_not_inserted';
  enforceSecurity: false, // boolean;
}): { table: string; 
  record_id: string; // sys_id of the new record
};

// Changes field values of a record on the server.
// follow this step with atf.server.recordValidation step to ensure that the changes were applied.
atf.server.recordUpdate({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: resolve_table_fields(''), // table name
  fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values, example: { "field_name": "value1", "field_two": "value2" }
  recordId: '', // sys_id of the record
  assert: 'record_successfully_updated', // 'record_successfully_updated' | 'record_not_updated';
  enforceSecurity: false, // boolean;
}): void;

// Deletes a record of a table.
atf.server.recordDelete({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: get_table_name(''), // table name
  recordId: '', // sys_id of the record
  enforceSecurity: false, // boolean
  assert: 'record_successfully_deleted', // 'record_successfully_deleted' | 'record_not_deleted';
}): void;

```