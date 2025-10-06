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
  //  $id: Now.ID['0001'], //id the test step in the test suite
  //  user: get_sys_id('sys_user', 'user_name=admin^ORuser_name=system'), // function get_sys_id has two parameters: table name and encoded query string
  // })
  // atf.form.openNewForm({
  //  $id: Now.ID['0002'], //id the test step in the test suite
  //  table: 'incident',
  //  view: '',
  //  formUI: 'standard_ui'
  // })
  // only declare return variable if and only if it is used later
  // const outputOfSubmit = atf.form.submitForm({
  //   $id: Now.ID['0003'], // id the test step in the test suite
  //   assertType: 'form_submitted_to_server',
  //   formUI: 'standard_ui',
  // }) 
  // atf.form.openExistingRecord({
  //   $id: Now.ID['0004'], // id the test step in the test suite
  //   table: 'incident',
  //   recordId: outputOfSubmit.recordId, // use the declared variable to fill in value
  //   formUI: 'service_operations_workspace',
  //   view: '',
  //   selectedTabIndex: 0,
  // })
  // atf.server.log({
  //   $id: Now.ID['0005'], // id the test step in the test suite
  //   log: `record opened: ${outputOfSubmit.recordId}` // explicitly use ${} for embedding function calls or variables in strings Template Literals
  // })
  // Additional steps...
})
//
```
