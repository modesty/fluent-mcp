// Impersonates the specified user in the current session for the duration of the test or until another user is impersonated.
atf.server.impersonate({
  $id: Now.ID[''], // string | guid, mandatory
  user: get_sys_id('sys_user', ''), // sys_id | Record&lt;'sys_user'&gt;
});

// Create a user with specified roles and groups. Optionally impersonate the user in the current session for the duration of the test or until another user is impersonated.
atf.server.createUser({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values, example: { "user_name": "john.doe", "home_phone": "18581234567" }. Do NOT include first_name or last_name
  groups: [get_sys_id('sys_user_group', '')], // array of sys_id | Record&lt;'sys_user_group'&gt;
  roles: [get_sys_id('sys_user_role', '')], // array of sys_id | Role;
  impersonate: false, // boolean
  firstName: '', // string
  lastName: '', // string
});

// Logs a message that can contain a variable or other information pertaining to the test. This message will be stored as a step result upon test completion.
atf.server.log({
    $id: Now.ID[''], // string | guid, mandatory
    log: '', // string
});

// Perform a database query to verify if a record matching the conditions set in this step are met
atf.server.recordQuery({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  fieldValues: '', // string, servicenow encoded query
  enforceSecurity: true, // boolean; defaults to true in SDK v4.5.0
  assert: 'records_match_query', // 'records_match_query' | 'no_records_match_query';
});

// Inserts a record into a table. Specify the field values to set on the new record, outputs the table and the sys_id of the new record.
atf.server.recordInsert({ // all props are mandatory
    $id: Now.ID[''], // string | guid, mandatory
    table: '', // table name
    fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values, example: { "field_one": "value1", "field_two": "value2" }
    assert: '', // 'record_successfully_inserted' | 'record_not_inserted';
    enforceSecurity: true, // boolean; defaults to true in SDK v4.5.0
 });

// Sets output variables for the test step. Use to pass data between test steps.
atf.server.setOutputVariables({
  $id: Now.ID[''], // string | guid, mandatory
  variables: {}, // a valid JSON object, keys are variable names and values are the variable values, example: { "var_name": "var_value" }
});

// Runs a server-side script in the context of the test.
atf.server.runServerSideScript({
  $id: Now.ID[''], // string | guid, mandatory
  script: '', // string, the server-side script to execute
});

// Adds attachments to an existing record.
atf.server.addAttachmentsToExistingRecord({
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  recordId: '', // sys_id of the record
  attachments: [], // array of attachment objects
});