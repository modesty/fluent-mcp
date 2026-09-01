# The ATF `Test()` container — scaffold, output chaining, and where every step sub-type lives

```typescript
// Fluent ATF Test — the container all atf.* steps are authored inside.
// Only $id and name are mandatory; active defaults to true, failOnServerError defaults to FALSE.
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

// Capture the return value only if a TestSuite() will reference this test.
export const incidentCreateTest = Test({
  $id: Now.ID['atf_0001'],
  name: 'Incident: create via form and verify server-side',
  description: 'Creates an itil user, files an incident through the standard UI, then asserts the saved record server-side',
  active: true,
  failOnServerError: true, // set explicitly — the platform default is false
}, (atf) => {
  // ── atf.server: setup. createUser + impersonate avoids hardcoding a sys_id entirely.
  //    (In real tests resolve references with get_sys_id('sys_user', 'user_name=admin').)
  atf.server.createUser({
    $id: Now.ID['atf_0001_user'],
    firstName: 'Ada',
    lastName: 'Tester',
    roles: ['itil'],
    impersonate: true,
    description: 'Run the rest of the test as a fresh itil user', // a shared step value
  })

  // ── atf.form: standard-UI form lifecycle. See the `atf-form` sub-type for all 7 steps.
  atf.form.openNewForm({
    $id: Now.ID['atf_0001_open'],
    table: 'incident',
    formUI: 'standard_ui',
    view: '',
  })

  atf.form.setFieldValue({
    $id: Now.ID['atf_0001_fill'],
    table: 'incident',
    fieldValues: { short_description: 'Printer on 3rd floor is offline' },
    formUI: 'standard_ui',
  })

  // The assertion input is `assert` — there is no `assertType` property on any ATF step.
  const submitted = atf.form.submitForm({
    $id: Now.ID['atf_0001_submit'],
    assert: 'form_submitted_to_server',
    formUI: 'standard_ui',
  })

  // ── Chaining: inputs are camelCase (recordId), outputs are snake_case (record_id).
  //    Reading `submitted.recordId` would be undefined at runtime.
  atf.server.recordValidation({
    $id: Now.ID['atf_0001_verify'],
    table: 'incident',
    recordId: submitted.record_id,
    fieldValues: 'active=true^short_descriptionLIKEPrinter', // encoded query, not an object
    assert: 'record_validated',
    enforceSecurity: false,
  })

  atf.server.log({
    $id: Now.ID['atf_0001_log'],
    log: `created incident ${submitted.record_id}`, // ${} template literal
  })
})

// ── Where the 93 step APIs live — fetch the sub-type, not this file ──────────────────
// get-snippet / get-api-spec / get-instruct with the metadata type on the left:
//
//   atf-form                      atf.form.*             open/fill/submit, modals
//   atf-form-field                atf.form.*             field value + state asserts
//   atf-form-action               atf.form.*             classic UI Action visibility/click
//   atf-form-declarative-action   atf.form.*             declarative (UX) actions
//   atf-form-sp                   atf.form_SP.*          the same flow in Service Portal
//   atf-list                      atf.list.*             list/related-list, filters, list UI Actions
//   atf-server                    atf.server.*           impersonate, createUser, log, run script
//   atf-server-record             atf.server.*           record CRUD + data asserts, no UI
//   atf-server-catalog-item       atf.server.*           catalog/cart server-side
//   atf-catalog-action            atf.catalog.*          order a catalog item via UI
//   atf-catalog-validation        atf.catalog.*          variable/price asserts
//   atf-catalog-variable          atf.catalog.*          record producers, set variables
//   atf-email                     atf.email.*            inbound generation, outbound asserts
//   atf-rest-api                  atf.rest.*             send request, status/header/timing
//   atf-rest-assert-payload       atf.rest.*             JSON/XML payload asserts
//   atf-appnav                    atf.applicationNavigator.*   menu/module visibility, navigate
//   atf-reporting                 atf.reporting.*, atf.responsiveDashboard.*
//   atf-ui-test-script            atf.uiTestScript.*     TestingLibrary for custom UI
//
//   test-suite                    TestSuite()            group finished tests into a runnable suite
//
// Not yet covered by a sub-type spec: atf.catalog_SP.* (19 Service Portal catalog/order-guide
// steps) — read them with explain_fluent_api.
```
