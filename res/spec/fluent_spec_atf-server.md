#**Context:** This chunk provides APIs for user session management and logging in ServiceNow's ATF. It includes operations like impersonating a user, creating a user with specific roles and groups, logging messages for tests, performing record queries, and inserting records into tables. These functionalities are crucial for simulating different user interactions and ensuring databases reflect expected test results.
```typescript
// Impersonates the specified user in the current session for the duration of the test or until another user is impersonated.
atf.server.impersonate({
  $id: Now.ID[''], // string | guid, mandatory
  user: Now.ref('sys_user', '<sys_id>'), // sys_id | Record&lt;'sys_user'&gt; - an earlier step's output (createUser(...).user) or a
    // sys_id looked up on the instance; never the coalesce-key Now.ref form (it writes a random sys_id per build)
}): { 
  user: '' // sys_id of the user
};

// Create a user with specified roles and groups. Optionally impersonate the user in the current session for the duration of the test or until another user is impersonated.
// Test as a DEDICATED user with the app's role, never as admin: create the user first in every test.
// The app's role, declared once at module level (e.g. in the app's roles file) and passed by reference:
const appUserRole = Role({ name: 'x_app.user' }) // no $id: deprecated on Role (the identity is derived from `name`)
atf.server.createUser({ // every property except $id is optional
  $id: Now.ID[''], // string | guid, mandatory
  fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values, example: { "user_name": "john.doe", "home_phone": "18581234567" }. Do NOT include first_name or last_name
  groups: [Now.ref('sys_user_group', '<sys_id>')], // array of sys_id | Record&lt;'sys_user_group'&gt; - a sys_id looked up on the instance
  roles: [appUserRole], // (string | Role)[], default [] - pass the app's Role() record or a role sys_id. A role NAME
    // string ('x_app.user') is NOT resolved: the user is created with no role
  impersonate: true, // boolean, default TRUE - every later step runs as this user. With false, follow with impersonate
  firstName: '', // string
  lastName: '', // string
}): { user: any; }; // the created user's sys_id - pass it to impersonate / requestedFor / reference inputs

// Logs a message that can contain a variable or other information pertaining to the test. This message will be stored as a step result upon test completion.
atf.server.log({
    $id: Now.ID[''], // string | guid, mandatory
    log: '', // string
}): void;

// Perform a database query to verify if a record matching the conditions set in this step are met
atf.server.recordQuery({ // all props are mandatory
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  fieldValues: '', // string, servicenow encoded query
  enforceSecurity: true, // boolean; recordQuery DEFAULTS TO FALSE (unlike the other record steps, which default to true) -
    // set it to true explicitly so the query runs with the test user's access
  assert: 'records_match_query', // 'records_match_query' | 'no_records_match_query';
}): { table: string;
    first_record: string; // sys_id of the first record - snake_case OUTPUT
};

// Inserts a record into a table. Specify the field values to set on the new record, outputs the table and the sys_id of the new record.
atf.server.recordInsert({ // all props are mandatory
    $id: Now.ID[''], // string | guid, mandatory
    table: '', // table name
    fieldValues: {}, // a valid JSON object, field must be snake_case and double-quoted and values must be double-quoted with properly escaped JSON values, example: { "field_one": "value1", "field_two": "value2" }
    assert: '', // 'record_successfully_inserted' | 'record_not_inserted';
    enforceSecurity: true, // boolean; defaults to true in SDK v4.5.0
 }): { table: string;
    record_id: string; // sys_id of the new record - snake_case OUTPUT (newRecord.record_id), never .recordId
};

// NOTE: atf.server.setOutputVariables was REMOVED in SDK v4.14.0 (TS2339; the build warns "Unknown ATF step").
// Its step configuration now backs atf.setReusableTestOutputs, valid only inside a reusable test (isReusable: true)
// - see the `atf` spec, REUSABLE TESTS.

// Runs a server-side script in the context of the test.
atf.server.runServerSideScript({
  $id: Now.ID[''], // string | guid, mandatory
  script: '', // string, the server-side script to execute
}): void;

// Adds attachments to an existing record.
atf.server.addAttachmentsToExistingRecord({
  $id: Now.ID[''], // string | guid, mandatory
  table: '', // table name
  recordId: '', // sys_id of the record
  attachments: [], // array of attachment objects
}): void;
```