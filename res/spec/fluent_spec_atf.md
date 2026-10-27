# **Context:** ATF `Test()` API spec — the **container** every ATF step is authored inside, and the entry point for the whole `atf-*` family. One `Test()` call writes a single `sys_atf_test` row plus one step row per step called on the callback's `atf` argument — or, with `isReusable: true` (SDK v4.14.0+), a **reusable test** (`sys_atf_test_callable`) with typed `inputs`/`outputs` that other tests invoke as one step via `atf.executeTest`. Import `Test` from `@servicenow/sdk/core`. The 92 step APIs themselves are **not** in this spec: they are split across 18 sibling metadata types indexed at the bottom of this file — fetch the one matching what you are testing. **Authoring only** — `Test()` never runs anything; execute tests through ATF's UI, its scheduler, or CI/CD (in this MCP server, `cicd_fluent_test` with `target: 'test'`). To group tests into a runnable suite, see the `test-suite` metadata type (`TestSuite()` / `sys_atf_test_suite`).

```typescript
import { Test, StringColumn, ReferenceColumn } from '@servicenow/sdk/core'

// ══ THE CONTAINER ══
// Only `$id` and `name` are mandatory. Everything else is optional with a platform default.
// (Older guidance claiming "all properties are mandatory" is wrong — verified against
//  TestSetup in @servicenow/sdk-core/dist/app/Test.d.ts and the sys_atf_test schema.)
export const myTest = Test({
  $id: Now.ID['my_test'], // Now.ID | string | number, mandatory - identity. Pass a raw 32-char sys_id
    // to edit an existing test in place
  name: 'Incident: assignment rules', // string, mandatory - test name, shown in the ATF Tests list,
    // the suite picker, and test results. maxLength 100
  description: 'What this test proves and any preconditions', // string, optional (default '') - maxLength 1000
  active: true, // boolean, optional (DEFAULT true) - inactive tests are skipped by runners and suites
  failOnServerError: true, // boolean, optional (DEFAULT false) - fail the test when a server-side error
    // is logged while a UI step runs. Recommended true: silent server errors otherwise pass as green
  // isReusable: false, // optional (SDK v4.14.0+) - only `false` is valid on a standard test; `true` selects the
    // reusable overload (see REUSABLE TESTS below)
  // protectionPolicy: 'read', // 'read' | 'protected', optional - written to sys_policy
  // $override: { ... },       // optional - extra sys_atf_test columns
  // NOT accepted: `$meta` (TS2769 "No overload matches this call" — Test() has two overloads since SDK v4.14.0; no
  // installMethod, no useEsLatest). Test() is WithIdAndMetadata, which carries
  // only protectionPolicy + $override; this was already true in SDK v4.13.6.
}, (atf) => {
  // Steps go here. `atf` is the step builder; every step is `atf.<namespace>.<method>({ ... })`.
  // Step ORDER is array/call order — the order you call them in this body. There is no `order` field.
  // Each step needs its own unique `$id`.
  atf.server.log({ $id: Now.ID['my_test_s1'], log: 'starting' })
})
// Returns a TestInstance ({ input, configurationFunction }). Capture it ONLY if a TestSuite references it, and
// export it - `now-sdk build` type-checks .now.ts files with noUnusedLocals, so an unused `const` fails (TS6133):
//   TestSuite({ $id: Now.ID['suite'], name: 'Smoke', tests: [myTest] })   // see the `test-suite` spec
// NOT exposed by this API (present on sys_atf_test but unauthorable through Test()):
//   parameters / enable_parameterized_testing / remember / copied_from / test_origin.
//   Parameterized testing is configured on the instance; `params('name')` only READS an active set
//   from inside atf.uiTestScript.runTest script bodies.
```

```typescript
// ══ VALUES EVERY STEP ACCEPTS ══
// All 92 steps (93 before SDK v4.14.0 removed atf.server.setOutputVariables) take these five optional properties on top of their own inputs (StandardStepValues),
// so they are documented here once instead of in all 18 sub-type specs.
Test({ $id: Now.ID['std_values'], name: 'Standard step values' }, (atf) => {
  atf.server.log({
    $id: Now.ID['std_values_s1'], // string | guid, mandatory on EVERY step - unique within the test
    log: 'message', // ── the step's own inputs ──

    // ── the five shared optionals, valid on every step in every namespace ──
    active: true, // boolean, optional (default true) - deactivate a step without deleting it
    description: 'Why this step exists', // string, optional
    notes: 'Working notes for maintainers', // string, optional
    timeout: { minutes: 2 }, // Duration { days?, hours?, minutes?, seconds? }, optional - per-step timeout.
      // An OBJECT, not a string: '00:02:00' is TS2559. Written as '1970-01-01 00:02:00'
    warning: 'Shown on the step form', // string, optional
  })
})

// ══ NAMING RULE — the single most common ATF authoring mistake ══
// Step INPUTS are camelCase:   recordId, fieldValues, formUI, enforceSecurity, relatedListTable
// Step OUTPUTS are snake_case: record_id, first_record, random_string, cart_item_id,
//                             catalog_item_id, request_id, output_email_record,
//                             output_reply_email_record, table, user, cart
// So `atf.form.openExistingRecord({ recordId: submitted.record_id })` mixes both — correctly,
// and reading `submitted.recordId` is undefined at runtime.
// ONE step breaks the rule on both sides — atf.server.replayRequestItem, which takes the
// snake_case input `request_item` and returns the camelCase output `reqItem`. Nothing else does.
// (Reusable-test outputs are the exception by design: they keep the keys YOU declare in `outputs`.)
// There is NO `assertType` input anywhere; the assertion input is always `assert`.
```

```typescript
// ══ CHAINING STEP OUTPUTS ══
// Some steps return outputs. Capture the return value in a `const` ONLY when a later step consumes it —
// an unused `const` fails the build (TS6133). Reference the output by property, never by re-querying.
Test({
  $id: Now.ID['chaining'],
  name: 'Create an incident and reopen it',
  failOnServerError: true,
}, (atf) => {
  // Test as a DEDICATED user, never as admin or another existing user. createUser impersonates the new
  // user by default (impersonate: true), so every later step runs as that user. Pass the app's role as its
  // Role() record or sys_id — a role NAME string ('x_app.user') is not resolved and the user gets no role.
  atf.server.createUser({
    $id: Now.ID['chaining_s1'],
    firstName: 'ATF',
    lastName: 'Agent',
    // roles: [appUserRole], // (string | Role)[] - the Role() record exported by your app
  })

  atf.form.openNewForm({
    $id: Now.ID['chaining_s2'],
    table: 'incident',
    formUI: 'standard_ui',
    view: '',
  })

  const submitted = atf.form.submitForm({
    $id: Now.ID['chaining_s3'],
    assert: 'form_submitted_to_server', // the input is `assert` — NOT `assertType`
    formUI: 'standard_ui',
  })
  // submitForm returns { table, record_id } — note the snake_case output key.

  atf.form.openExistingRecord({
    $id: Now.ID['chaining_s4'],
    table: 'incident',
    recordId: submitted.record_id, // ← input camelCase, output snake_case (see NAMING RULE above)
    formUI: 'standard_ui',
    view: '',
    selectedTabIndex: 0,
  })

  atf.server.log({
    $id: Now.ID['chaining_s5'],
    log: `opened ${submitted.record_id}`, // use ${} template literals to embed variables
  })
})
```

```typescript
// ══ REUSABLE TESTS (SDK v4.14.0+) ══
// A reusable test is the same Test() constructor (an overload — there is no ReusableTest() constructor).
// `isReusable: true`, `inputs` and `outputs` ALL go in ARG 1, the config (the docs' "Test(..., { isReusable: true })"
// shorthand is misleading). It writes sys_atf_test_callable (NOT sys_atf_test), plus one atf_input_variable_callable /
// atf_output_variable_callable row per declared column. Export it so callers can reference it.
export const createIncidentForCaller = Test(
  {
    $id: Now.ID['atf_reusable_create_incident'], // mandatory, as on a standard test
    name: 'Reusable: create an incident for a caller', // mandatory
    description: 'Inserts an incident for the supplied caller and returns its sys_id', // optional
    isReusable: true, // literal `true`, mandatory on this overload - selects ReusableTestSetup
    inputs: { // { [key]: <Column>() }, optional - declared exactly like a Table() schema. EVERY key is a required
      // argument of atf.executeTest regardless of `mandatory` (that flag only affects the platform at run time)
      caller: ReferenceColumn({ referenceTable: 'sys_user', label: 'Caller' }), // written as `reference=sys_user`
      shortDescription: StringColumn({ label: 'Short description', maxLength: 160 }),
      // Any column type is accepted (String, Integer, Boolean, Reference, DateTime, Choice …), BUT a
      // ChoiceColumn's `choices` are silently dropped — no sys_choice rows are written, only internal_type=choice.
    },
    outputs: { // optional - same shape as inputs; populated with atf.setReusableTestOutputs
      incidentId: StringColumn({ label: 'Incident sys_id', maxLength: 32 }), // use StringColumn for a sys_id that later steps
        // consume: a ReferenceColumn output is typed string | Record | ExplicitKey | TableBrand and is NOT assignable to a
        // step's `recordId` (TS2322). ALWAYS set maxLength: unset, no max_length is written and the platform truncates the
        // value to 30 characters, so a 32-char sys_id silently breaks the next step (verified live on an instance)
    },
    // Also accepted: active, failOnServerError, protectionPolicy, $override. NOT $meta.
  },
  // THREE parameters: (atf, inputs, outputs). Read inputs directly — `inputs.caller` compiles to the GEM placeholder
  // {{callable_input['<sys_atf_test_callable sys_id>'].caller}}. `outputs` is only a schema handle for
  // setReusableTestOutputs; never read it. Unused parameters fail the build (TS6133): name an unread one `_inputs`.
  (atf, inputs, outputs) => {
    const inserted = atf.server.recordInsert({
      $id: Now.ID['atf_reusable_create_incident_insert'],
      table: 'incident',
      fieldValues: { caller_id: inputs.caller, short_description: inputs.shortDescription },
      assert: 'record_successfully_inserted',
      enforceSecurity: true,
    })
    // atf.setReusableTestOutputs(outputs, stepConfig, values) - a plain atf.* method (no namespace), valid ONLY inside
    // a reusable test's own body (else TS213 "atf.setReusableTestOutputs can only be called inside a reusable Test's own
    // configurationFunction (isReusable: true)"), and only when it declares `outputs` (else "This reusable test declares
    // no 'outputs' to set"). Writes a "Set Output Variables" sys_atf_step. Every key is optional and also accepts a
    // string; a misspelled key is TS2561. It may be called more than once; each declared output not given a value is
    // written as an empty value.
    atf.setReusableTestOutputs(
      outputs,
      { $id: Now.ID['atf_reusable_create_incident_outputs'] }, // $id + the five standard step values
      { incidentId: inserted.record_id }, // → {{step['<insert step sys_id>'].record_id}}
    )
  },
)
// Returns ReusableTest<I, O>. It is NOT a TestInstance, so it cannot go in TestSuite({ tests }) (TS2322).

Test(
  {
    $id: Now.ID['atf_reusable_caller'],
    name: 'Incident: create via reusable test and verify',
    failOnServerError: true,
  },
  (atf) => {
    const tester = atf.server.createUser({
      $id: Now.ID['atf_reusable_caller_user'],
      firstName: 'ATF',
      lastName: 'Caller',
    })
    // atf.executeTest(reusableTest, stepConfig, inputs) → the reusable test's typed outputs. Writes ONE
    // sys_atf_step_callable row ("Execute Test: <name>") plus one sys_variable_value per input.
    // TYPED overload (a ReusableTest from this project or `now-sdk dependencies`): every declared input is required, and a
    // missing or misspelled key is a compile error (TS2769). Passing a standard test fails the build twice: the plugin's
    // "Expected a reference to a Test(...) with 'isReusable: true' or a sys_id string" (a Fluent diagnostic, printed as
    // TS213 — a node kind, not a stable code) plus TS2769 "No overload matches this call" from the typed call.
    // SYS_ID overload: atf.executeTest('<32-char sys_id>', { $id }, { anyKey: 'x' }) - inputs/outputs untyped (any). Its
    // input variable sys_ids are regenerated on every build and cannot match the instance's real variables, so the inputs
    // likely do not bind (not instance-verified) - prefer the typed overload.
    const created = atf.executeTest(
      createIncidentForCaller,
      { $id: Now.ID['atf_reusable_caller_execute'] },
      { caller: tester.user, shortDescription: 'Created by a reusable ATF test' },
    )
    atf.server.recordValidation({
      $id: Now.ID['atf_reusable_caller_verify'],
      table: 'incident',
      recordId: created.incidentId, // → {{step['<executeTest step sys_id>'].incidentId}}
      fieldValues: 'active=true^short_descriptionLIKEreusable', // ONE validation per record state, joined with ^
      assert: 'record_validated',
      enforceSecurity: true, // never bypass the impersonated user with enforceSecurity: false
    })
  },
)
// A reusable test may itself call another reusable test with atf.executeTest; GEM references chain across both.
```

## Step sub-type index — 18 metadata types, 12 `atf.*` namespaces

Every step below is reached as `atf.<namespace>.<method>` on this callback's `atf` argument; none needs its own import. Fetch a row's detail with `get-api-spec`, `get-instruct`, or `get-snippet` using the **metadata type** in column 1. The two reusable-test methods, `atf.executeTest` and `atf.setReusableTestOutputs` (SDK v4.14.0+), are top-level `atf.*` methods in no namespace; they are documented above, not in a sub-type.

| metadata type | namespace | use it for | steps |
|---|---|---|---|
| `atf-form` | `atf.form` | standard-UI form lifecycle: open, fill, submit, modals | `openNewForm`, `openExistingRecord`, `setFieldValue`, `fieldValueValidation`, `submitForm`, `clickUIAction`, `clickModalButton` |
| `atf-form-field` | `atf.form` | field-level value and state (mandatory/readonly/visible) assertions | `openNewForm`, `openExistingRecord`, `setFieldValue`, `fieldValueValidation`, `fieldStateValidation` |
| `atf-form-action` | `atf.form` | classic UI Action visibility and clicking | `uiActionVisibility`, `clickUIAction` |
| `atf-form-declarative-action` | `atf.form` | declarative (UX) action visibility and clicking | `declarativeActionVisibility`, `clickDeclarativeAction` |
| `atf-form-sp` | `atf.form_SP` | the same form lifecycle inside **Service Portal** | `openServicePortalPage`, `openNewForm`, `setFieldValue`, `fieldValueValidation`, `fieldStateValidation`, `uiActionVisibilityValidation`, `clickUIAction`, `addAttachmentsToForm`, `submitForm` |
| `atf-list` | `atf.list` | list / related-list visibility, filtering, membership, list UI Actions | `relatedListVisibility`, `applyFilterToList`, `recordPresentInList`, `openRecordInList`, `listUIActionVisibility`, `clickListUIAction` |
| `atf-server` | `atf.server` | server-side setup and scripting: impersonation, users, logging, scripts | `impersonate`, `createUser`, `log`, `runServerSideScript`, `recordInsert`, `recordQuery`, `addAttachmentsToExistingRecord` |
| `atf-server-record` | `atf.server` | server-side record CRUD and data assertions (no UI) | `recordInsert`, `recordQuery`, `recordUpdate`, `recordDelete`, `recordValidation` |
| `atf-server-catalog-item` | `atf.server` | server-side catalog/cart operations | `searchForCatalogItem`, `checkoutShoppingCart`, `replayRequestItem` |
| `atf-catalog-action` | `atf.catalog` | ordering a catalog item through the UI | `openCatalogItem`, `setCatalogItemQuantity`, `addItemToShoppingCart`, `orderCatalogItem` |
| `atf-catalog-validation` | `atf.catalog` | catalog variable/price assertions | `openCatalogItem`, `orderCatalogItem`, `validateVariableValue`, `variableStateValidation`, `validatePriceAndRecurringPrice` |
| `atf-catalog-variable` | `atf.catalog` | record producers and setting catalog variables | `openRecordProducer`, `setVariableValue`, `submitRecordProducer` |
| `atf-email` | `atf.email` | inbound email generation and outbound notification assertions | `generateInboundEmail`, `generateInboundReplyEmail`, `generateRandomString`, `validateOutboundEmail`, `validateOutboundEmailGeneratedByNotification`, `validateOutboundEmailGeneratedByFlow` |
| `atf-rest-api` | `atf.rest` | sending a REST request and asserting status/headers/timing | `sendRestRequest`, `assertStatusCode`, `assertStatusCodeName`, `assertResponseHeader`, `assertResponseTime` |
| `atf-rest-assert-payload` | `atf.rest` | asserting JSON/XML response payload shape and elements | `assertResponsePayload`, `assertJsonResponsePayloadElement`, `assertResponseJSONPayloadIsValid`, `assertXMLResponsePayloadElement`, `assertResponseXMLPayloadIsWellFormed` |
| `atf-appnav` | `atf.applicationNavigator` | application menu / module visibility and navigation | `applicationMenuVisibility`, `moduleVisibility`, `navigateToModule` |
| `atf-reporting` | `atf.reporting`, `atf.responsiveDashboard` | report and responsive-dashboard visibility and sharing | `reportVisibility`, `responsiveDashboardVisibility`, `responsiveDashboardSharing` |
| `atf-ui-test-script` | `atf.uiTestScript` | TestingLibrary scripts against custom UI / `now-*` web components | `runTest` |

Routing notes:

- `atf.form` is split across four sub-types by **intent**, and the open/fill steps deliberately repeat in `atf-form` and `atf-form-field`. Start at `atf-form` for a whole form flow; go to the narrower type when the assertion *is* the point.
- Service Portal has its own namespace: `atf.form_SP.*`, never `atf.form.*`. Fetch `atf-form-sp`.
- Prefer `atf-server-record` over UI steps when you only need to prove data changed — it is faster and less brittle.
- The server step "setOutputVariables" was **removed in SDK v4.14.0** (TS2339; the build warns "Unknown ATF step"). Its step configuration now backs `atf.setReusableTestOutputs`, which is valid only inside a reusable test.
- **Not covered by any sub-type spec:** `atf.catalog_SP.*` (19 Service Portal catalog/order-guide steps, including `openOrderGuide`, `addRowToMultiRowVariableSet`, `submitOrderGuide`). They exist in the SDK; read them with `explain_fluent_api` until a sub-type spec is added.
