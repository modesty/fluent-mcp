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
4. **Never hardcode a sys_id, and never test as admin.** Start every test by creating a dedicated test user with `atf.server.createUser` (it impersonates the new user by default) and the app's role. Pass the role as the app's `Role()` record or its sys_id: a role **name** string such as `'x_app.user'` is not resolved, and the user is created with no role. For any other referenced record, use an earlier step's output when the test created it; otherwise look its sys_id up on the instance (e.g. with this server's query_fluent_records tool) and pass `Now.ref('<table>', '<sys_id>')`. Never use the coalesce-key form `Now.ref('<table>', { <field>: '<value>' })` for a record that exists only on the instance: in an ATF step input the build writes a fresh random sys_id on every build, with no lookup keys, so the reference never resolves. Do not use get_sys_id(...): it is not an SDK API and fails the build (TS2304).
5. **Capture a step's return value in a `const` only when a later step consumes it.** Chain by property (`submitted.record_id`), never by re-querying the record. `now-sdk build` type-checks `.now.ts` files with the unused-locals and unused-parameters checks on, so an unused `const` or callback parameter fails the build (TS6133). Export a test you capture only for a `TestSuite`.
6. **Step inputs are camelCase; step outputs are snake_case.** `atf.form.openExistingRecord({ recordId: submitted.record_id })` correctly mixes both. Outputs are `record_id`, `first_record`, `random_string`, `cart_item_id`, `catalog_item_id`, `request_id`, `output_email_record`, `output_reply_email_record`, `table`, `user`, `cart`. Reading `.recordId` off a step result is always a bug. Exactly one step breaks the rule in both directions — `atf.server.replayRequestItem` takes the snake_case input `request_item` and returns the camelCase output `reqItem`. Likewise the assertion input is **`assert`** — the commonly copied misspelling "assertType" is not a property of any step.
7. **Sequence steps the way the UI requires.** Impersonate first, open a form or list before asserting on it, and put a step that navigates away (`clickUIAction`, `clickListUIAction`, `orderCatalogItem`) last for that page.
8. **Every step also accepts `active`, `description`, `notes`, `timeout`, and `warning`** on top of its own inputs. They are documented once in the `atf` spec rather than in all 18 sub-type specs.
9. **Prefer server-side assertions when only the data matters.** `atf.server.recordValidation` is faster and far less brittle than driving a form. Use UI steps when the UI behavior itself is what needs proving.
10. **`Test()` does not accept `$meta`.** There is no `installMethod` or `useEsLatest` on a test (TS2769 "No overload matches this call", since `Test()` has two overloads in SDK v4.14.0); this was already true in SDK v4.13.6, and older guidance saying otherwise was wrong. `protectionPolicy` (`'read'` | `'protected'`, written to `sys_policy`) and `$override` are accepted.
11. **Parameterized testing is not authorable here.** `parameters`, `enable_parameterized_testing`, and `remember` exist on `sys_atf_test` but not on the `Test()` API; parameter sets are configured on the instance. `params('name')` only *reads* an active set inside a `atf.uiTestScript.runTest` body.
12. **`Test()` runs nothing.** It authors metadata. Group tests with `TestSuite()` (see the `test-suite` type) and execute through ATF's UI, its scheduler, or the cicd_fluent_test tool exposed by this MCP server (`target: 'test'` for one test, `target: 'testsuite'` for a suite).
13. **Author steps only from the sub-type spec you fetched.** Do not invent method names or inputs; the 12 namespaces are closed sets. Verify a build succeeds, then confirm the test actually passes on an instance before relying on it.
14. **Look up the table before using it in a step.** Before any step that writes or reads a table (`setFieldValue`, `recordInsert`, `recordUpdate`, …), look up that table's field definitions on the instance (e.g. with this server's query_fluent_records tool against `sys_dictionary`): which fields are mandatory, and each field's type, including fields inherited from a parent table (`incident` inherits most of its fields from `task`). Give every mandatory field a valid value when a server step creates a record.
15. **One validation per record state.** Put every expected field value for a record in a single `atf.server.recordValidation`, joined with `^` (e.g. `fieldValues: 'discount_percent=15^total=4.25'`). Add another validation of the same record only for a different point in time, e.g. after a `recordUpdate`.
16. **Don't bypass the impersonated user.** Never set `enforceSecurity: false`, and never switch to admin to insert or validate. If a step fails on access, report the access gap. If the behavior needs a second user (e.g. an approver), create and impersonate another dedicated test user. If no app role grants access to the app's tables, the app is admin-only: create the test user with the `admin` role's sys_id, don't add roles or ACLs to the app while writing tests, and say so.

## Reusable tests (SDK v4.14.0+)

17. **A reusable test is `Test()` with `isReusable: true`**, and `isReusable`, `inputs` and `outputs` all go in **argument 1**, the config. It writes `sys_atf_test_callable` instead of `sys_atf_test`, plus one input/output variable row per declared column. Use one for a sequence several tests repeat (create a user with a role, create a prerequisite record), the way a subflow is reused in Flow Designer. Export it so callers can reference it.
18. **Declare `inputs` / `outputs` like a `Table()` schema** (`{ caller: ReferenceColumn({ referenceTable: 'sys_user' }) }`). Every declared input is a required argument of `atf.executeTest` whatever its `mandatory` flag says, and an extra or misspelled key is a compile error. Avoid `ChoiceColumn` inputs: their `choices` are silently dropped. Declare a sys_id that a later step consumes as a `StringColumn` output with `maxLength: 32`, not a `ReferenceColumn`; a reference output is not assignable to a step's `recordId` (TS2322). Always set `maxLength`: without it the build writes no max_length and the platform truncates the value to 30 characters — verified on an instance, where a 32-character incident sys_id arrived as 30 characters and the next `recordValidation` failed with "Unable to find record".
19. **The body takes three parameters, `(atf, inputs, outputs)`.** Read inputs directly (`inputs.caller`). Treat `outputs` only as the handle passed to `atf.setReusableTestOutputs`, never read it. Name an unread parameter `_inputs`, because an unused parameter fails the build.
20. **Populate outputs with `atf.setReusableTestOutputs(outputs, { $id }, { key: value })`.** It is a top-level `atf.*` method, valid only inside a reusable test's own body that declares `outputs`; anywhere else it is a build error. Values may be step outputs (`inserted.record_id`) or inputs.
21. **Call a reusable test with `atf.executeTest(reusableTest, { $id }, inputs)`.** It writes one callable step (table sys_atf_step_callable), and its return value carries the reusable test's typed outputs (e.g. created.incidentId). Prefer the typed overload, which passes the exported `Test()` value. The sys_id-string overload is untyped, and its input variable references are regenerated on every build, so the inputs likely do not bind on the instance (not instance-verified). Passing a standard test is a build error.
22. **A reusable test is not a `TestSuite` member.** `TestSuite({ tests })` accepts only standard tests and sys_id strings (a reusable test is TS2322). Put the standard tests that call it in the suite.
23. **Release-note corrections (SDK v4.14.0).** The 4.14.0 note's example fails `now-sdk build` with TS6133, because its caller assigns `const result = atf.executeTest(...)` and never reads it; read the result or don't capture it. The executetests doc types the first argument as "ReturnType of Test", which resolves to a standard test and is rejected; the real type is `ReusableTest<I, O>`. The docs' "Test(..., { isReusable: true })" shorthand is misleading: the key belongs in argument 1. The server step setOutputVariables was removed in 4.14.0 (TS2339): use `atf.setReusableTestOutputs` inside a reusable test.

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
| a reusable test, or calling one from another test (`atf.executeTest`) | `atf` (this type — see items 17–23) |
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
