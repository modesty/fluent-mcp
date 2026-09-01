# **Context:** ATF `Test()` API spec — the **container** every ATF step is authored inside, and the entry point for the whole `atf-*` family. One `Test()` call writes a single `sys_atf_test` row plus one step row per step called on the callback's `atf` argument. Import `Test` from `@servicenow/sdk/core`. The 93 step APIs themselves are **not** in this spec: they are split across 18 sibling metadata types indexed at the bottom of this file — fetch the one matching what you are testing. **Authoring only** — `Test()` never runs anything; execute tests through ATF's UI, its scheduler, or CI/CD (in this MCP server, `cicd_fluent_test` with `target: 'test'`). To group tests into a runnable suite, see the `test-suite` metadata type (`TestSuite()` / `sys_atf_test_suite`).

```typescript
// ══ THE CONTAINER ══
// Only `$id` and `name` are mandatory. Everything else is optional with a platform default.
// (Older guidance claiming "all properties are mandatory" is wrong — verified against
//  TestSetup in @servicenow/sdk-core/dist/app/Test.d.ts and the sys_atf_test schema.)
const myTest = Test({
  $id: Now.ID['my_test'], // Now.ID | string | number, mandatory - identity. Pass a raw 32-char sys_id
    // to edit an existing test in place
  name: 'Incident: assignment rules', // string, mandatory - test name, shown in the ATF Tests list,
    // the suite picker, and test results. maxLength 100
  description: 'What this test proves and any preconditions', // string, optional (default '') - maxLength 1000
  active: true, // boolean, optional (DEFAULT true) - inactive tests are skipped by runners and suites
  failOnServerError: true, // boolean, optional (DEFAULT false) - fail the test when a server-side error
    // is logged while a UI step runs. Recommended true: silent server errors otherwise pass as green
  $meta: { // optional - standard record metadata
    installMethod: 'demo', // 'first install' | 'demo' | 'once', optional - route this test to a
      // conditional output folder. 'demo' is the common choice for tests shipped as demo data
    useEsLatest: true, // boolean, optional - run this test's server-side script fields (the bodies of
      // atf.server.runServerSideScript and atf.uiTestScript.runTest) on the latest supported
      // ECMAScript version instead of the app default. Omit to inherit sys_app/now.config
  },
}, (atf) => {
  // Steps go here. `atf` is the step builder; every step is `atf.<namespace>.<method>({ ... })`.
  // Step ORDER is array/call order — the order you call them in this body. There is no `order` field.
  // Each step needs its own unique `$id`.
  atf.server.log({ $id: Now.ID['my_test_s1'], log: 'starting' })
})
// Returns { input, configurationFunction }. Capture it in a `const` ONLY if a TestSuite references it:
//   TestSuite({ $id: Now.ID['suite'], name: 'Smoke', tests: [myTest] })   // see the `test-suite` spec
// NOT exposed by this API (present on sys_atf_test but unauthorable through Test()):
//   parameters / enable_parameterized_testing / remember / copied_from / test_origin.
//   Parameterized testing is configured on the instance; `params('name')` only READS an active set
//   from inside atf.uiTestScript.runTest script bodies.
```

```typescript
// ══ VALUES EVERY STEP ACCEPTS ══
// All 93 steps take these five optional properties on top of their own inputs (StandardStepValues),
// so they are documented here once instead of in all 18 sub-type specs.
Test({ $id: Now.ID['std_values'], name: 'Standard step values' }, (atf) => {
  atf.server.log({
    $id: Now.ID['std_values_s1'], // string | guid, mandatory on EVERY step - unique within the test
    log: 'message', // ── the step's own inputs ──

    // ── the five shared optionals, valid on every step in every namespace ──
    active: true, // boolean, optional (default true) - deactivate a step without deleting it
    description: 'Why this step exists', // string, optional
    notes: 'Working notes for maintainers', // string, optional
    timeout: '00:02:00', // Duration, optional - per-step timeout
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
// There is NO `assertType` input anywhere; the assertion input is always `assert`.
```

```typescript
// ══ CHAINING STEP OUTPUTS ══
// Some steps return outputs. Capture the return value in a `const` ONLY when a later step consumes it;
// an unused `const` is noise. Reference the output by property, never by re-querying.
Test({
  $id: Now.ID['chaining'],
  name: 'Create an incident and reopen it',
  failOnServerError: true,
}, (atf) => {
  // Resolve references by query — NEVER hardcode a sys_id.
  atf.server.impersonate({
    $id: Now.ID['chaining_s1'],
    user: get_sys_id('sys_user', 'user_name=admin'), // sys_id | Record<'sys_user'>
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

## Step sub-type index — 18 metadata types, 12 `atf.*` namespaces

Every step below is reached as `atf.<namespace>.<method>` on this callback's `atf` argument; none needs its own import. Fetch a row's detail with `get-api-spec`, `get-instruct`, or `get-snippet` using the **metadata type** in column 1.

| metadata type | namespace | use it for | steps |
|---|---|---|---|
| `atf-form` | `atf.form` | standard-UI form lifecycle: open, fill, submit, modals | `openNewForm`, `openExistingRecord`, `setFieldValue`, `fieldValueValidation`, `submitForm`, `clickUIAction`, `clickModalButton` |
| `atf-form-field` | `atf.form` | field-level value and state (mandatory/readonly/visible) assertions | `openNewForm`, `openExistingRecord`, `setFieldValue`, `fieldValueValidation`, `fieldStateValidation` |
| `atf-form-action` | `atf.form` | classic UI Action visibility and clicking | `uiActionVisibility`, `clickUIAction` |
| `atf-form-declarative-action` | `atf.form` | declarative (UX) action visibility and clicking | `declarativeActionVisibility`, `clickDeclarativeAction` |
| `atf-form-sp` | `atf.form_SP` | the same form lifecycle inside **Service Portal** | `openServicePortalPage`, `openNewForm`, `setFieldValue`, `fieldValueValidation`, `fieldStateValidation`, `uiActionVisibilityValidation`, `clickUIAction`, `addAttachmentsToForm`, `submitForm` |
| `atf-list` | `atf.list` | list / related-list visibility, filtering, membership, list UI Actions | `relatedListVisibility`, `applyFilterToList`, `recordPresentInList`, `openRecordInList`, `listUIActionVisibility`, `clickListUIAction` |
| `atf-server` | `atf.server` | server-side setup and scripting: impersonation, users, logging, scripts | `impersonate`, `createUser`, `log`, `runServerSideScript`, `setOutputVariables`, `recordInsert`, `recordQuery`, `addAttachmentsToExistingRecord` |
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
- **Not covered by any sub-type spec:** `atf.catalog_SP.*` (19 Service Portal catalog/order-guide steps, including `openOrderGuide`, `addRowToMultiRowVariableSet`, `submitOrderGuide`). They exist in the SDK; read them with `explain_fluent_api` until a sub-type spec is added.
