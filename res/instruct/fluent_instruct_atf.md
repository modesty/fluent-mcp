# Instructions for Fluent ATF `Test()` — the shared scaffold for every `atf-*` step type

The 18 `atf-*` step metadata types all nest inside this scaffold. Nineteen sibling instruct files point here for it, so start every ATF authoring task from this file, then fetch the step sub-type you actually need (index at the bottom, full detail in the `atf` API spec).

```typescript
// Fluent ATF Test — the canonical scaffold
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'

Test({
  $id: Now.ID['descriptive_test_key'], // mandatory — a stable key or a valid 32-char sys_id
  name: 'Table: what is being proven',  // mandatory — string, maxLength 100
  description: 'Preconditions and what a pass means', // optional
  active: true,             // optional, defaults true
  failOnServerError: true,  // optional, defaults FALSE — set it true deliberately
}, (atf) => {
  // Steps in run order. Each step needs a unique $id. Order is call order.
})
```

1. **Only `$id` and `name` are mandatory.** `description`, `active`, and `failOnServerError` are all optional. Do not copy the old "all properties are mandatory" comment — it was wrong. `active` defaults to `true`; `failOnServerError` defaults to **`false`**, so set it to `true` explicitly whenever a test drives UI steps, or server-side errors will pass as green.
2. **Set `failOnServerError: true` by default.** Reach for `false` only when a test intentionally exercises an error path that logs server-side.
3. **Step order is call order.** There is no `order` property on a step and no way to renumber one. To reorder, move the call. Keep `$id` values unique within the test and name them so they survive reordering (`..._open_form`, not `..._step3`).
4. **Never hardcode a sys_id.** Resolve references with `get_sys_id('<table>', '<encoded query>')` — e.g. `get_sys_id('sys_user', 'user_name=admin')`, `get_sys_id('sys_ui_action', 'name=Resolve')`. A literal sys_id is instance-specific and breaks on install.
5. **Capture a step's return value in a `const` only when a later step consumes it.** Chain by property (`submitted.record_id`), never by re-querying the record. An unused `const` is noise.
6. **Step inputs are camelCase; step outputs are snake_case.** `atf.form.openExistingRecord({ recordId: submitted.record_id })` correctly mixes both. Outputs are `record_id`, `first_record`, `random_string`, `cart_item_id`, `catalog_item_id`, `request_id`, `output_email_record`, `output_reply_email_record`, `table`, `user`, `cart`. Reading `.recordId` off a step result is always a bug. Exactly one step breaks the rule in both directions — `atf.server.replayRequestItem` takes the snake_case input `request_item` and returns the camelCase output `reqItem`. Likewise the assertion input is **`assert`** — the commonly copied misspelling "assertType" is not a property of any step.
7. **Sequence steps the way the UI requires.** Impersonate first, open a form or list before asserting on it, and put a step that navigates away (`clickUIAction`, `clickListUIAction`, `orderCatalogItem`) last for that page.
8. **Every step also accepts `active`, `description`, `notes`, `timeout`, and `warning`** on top of its own inputs. They are documented once in the `atf` spec rather than in all 18 sub-type specs.
9. **Prefer server-side assertions when only the data matters.** `atf.server.recordValidation` is faster and far less brittle than driving a form. Use UI steps when the UI behavior itself is what needs proving.
10. **Use `$meta.useEsLatest` only when a script body needs it** — it applies to the server-side script fields in this test (`atf.server.runServerSideScript`, `atf.uiTestScript.runTest`). `$meta.installMethod: 'demo'` is the usual choice for tests shipped as demo data.
11. **Parameterized testing is not authorable here.** `parameters`, `enable_parameterized_testing`, and `remember` exist on `sys_atf_test` but not on the `Test()` API; parameter sets are configured on the instance. `params('name')` only *reads* an active set inside a `atf.uiTestScript.runTest` body.
12. **`Test()` runs nothing.** It authors metadata. Group tests with `TestSuite()` (see the `test-suite` type) and execute through ATF's UI, its scheduler, or the cicd_fluent_test tool exposed by this MCP server (`target: 'test'` for one test, `target: 'testsuite'` for a suite).
13. **Author steps only from the sub-type spec you fetched.** Do not invent method names or inputs; the 12 namespaces are closed sets. Verify a build succeeds, then confirm the test actually passes on an instance before relying on it.

## Which step sub-type to fetch

| you are testing | fetch |
|---|---|
| a standard-UI form flow (open → fill → submit) | `atf-form` |
| a specific field's value or state (mandatory/readonly/visible) | `atf-form-field` |
| a classic UI Action's visibility or click | `atf-form-action` |
| a declarative (UX) action | `atf-form-declarative-action` |
| any of the above **in Service Portal** (`atf.form_SP.*`) | `atf-form-sp` |
| a list or related list: visibility, filter, membership, list UI Actions | `atf-list` |
| server-side setup: impersonate, create users, log, run a script | `atf-server` |
| record CRUD / data assertions with no UI | `atf-server-record` |
| server-side catalog & cart operations | `atf-server-catalog-item` |
| ordering a catalog item through the UI | `atf-catalog-action` |
| catalog variable or price assertions | `atf-catalog-validation` |
| record producers and setting catalog variables | `atf-catalog-variable` |
| inbound email generation or outbound notification assertions | `atf-email` |
| sending a REST request; status, header, timing asserts | `atf-rest-api` |
| JSON/XML response payload asserts | `atf-rest-assert-payload` |
| application menu / module visibility and navigation | `atf-appnav` |
| report or responsive-dashboard visibility and sharing | `atf-reporting` |
| custom UI / `now-*` web components via TestingLibrary | `atf-ui-test-script` |
| grouping finished tests into a runnable suite | `test-suite` |

Service Portal catalog and order-guide steps (`atf.catalog_SP.*`, 19 steps) have no sub-type spec yet — read them with the explain_fluent_api tool if you need them.
