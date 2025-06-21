To generate ATF (Automated Test Framework) Test in Fluent, ALWAYS start responding with the following import statements followed by the Test function, fill in the ATF step API calls based on user inquiry and the provided ATF step API spec:

```typescript
// Fluent ATF Test
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({ // all properties are mandatory
$id: Now.ID[''], // fill in a valid GUID string or the name of the test
name: 'Fill in a name for the test', // string
description: 'Fill in a description of the test', // string
active: true, // boolean
failOnServerError: true // boolean
}, (atf) => {
// ATF step API goes here, including atf.form, atf.server, etc.
// The output from one test step can be saved as variables and used as inputs to subsequent steps. Example:
// atf.server.impersonate({
//   user: get_sys_id('sys_user', 'user_name=admin^ORuser_name=system'), // function get_sys_id has two parameters: table name and encoded query string
// })
// atf.form.openNewForm({
//  table: get_table_name('incident'), // function get_table_name has one parameter: table name hints
//  view: '',
//  formUI: 'standard_ui',
// only declare return variable if and only if it is used later
// const outputOfSubmit = atf.form.submitForm({
//   assertType: 'form_submitted_to_server',
//   formUI: 'standard_ui',
// atf.form.openExistingRecord({
//   table: get_table_name('incident'), // function get_table_name has one parameter: table name hints
//   recordId: outputOfSubmit.record_id, // use the declared variable to fill in value
//   formUI: 'service_operations_workspace',
//   view: '',
//   selectedTabIndex: 0,
// atf.server.log({
//   log: `record opened: ${outputOfSubmit.record_id}` // explicitly use ${} for embedding function calls or variables in strings Template Literals
// Additional steps...
})
//
```

You must follow these instructions carefully:

1. Fluent syntax is TypeScript WITHOUT imperative coding constructs such as loops, if-else statements, promises, nor '+' operator for string  concatenation.
2. ALWAYS use template literals for string interpolation and concatenation. Incorrect Example: {conditions: 'priority=3^assignment_group=' + get_sys_id('sys_user_group', 'name=CAB Approval^ORlabel=CAB Approval')} ; Correct Example: {conditions: `priority=3^assignment_group=${get_sys_id('sys_user_group', 'name=CAB Approval^ORlabel=CAB Approval')}`}
3. Ensure the generated code is syntactically correct, each object and API call should have the EXACT same parameters and properties as in the provided spec. Do NOT generate variable whose value is not used
4. Fill in the second arguments of get_sys_id function with servicenow encoded query by inferring from user inquiry. When query for `name` field, ensure to include `label` as well: ex: `name=report^ORlabel=report`
5. Fill in the argument of get_table_name and resolve_table_fields functions with the table name hint by inferring from user inquiry.
6. Write TypeScript code with direct assignments for property values, avoiding any function calls EXCEPT get_sys_id, get_table_name, resolve_table_fields, and declared return variables
