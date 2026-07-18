# Instructions for Fluent ATF UI Test Script (TestingLibrary) API

Always reference `fluent_instruct_atf.md` and the ATF UI Test Script API specification for details.

1. Start from the shared `Test()` scaffold in `fluent_instruct_atf.md`.
2. Use `atf.uiTestScript.runTest()` **only** for custom UI that the standard `atf.form.*` / `atf.catalog.*` steps cannot reach — Angular/React widgets, embedded SPAs, custom workspaces, and `now-*` web components. Use the standard ATF categories for standard forms, catalog items, and pure server-side logic.
3. Give every `Test()` and every step a unique `$id`. Steps execute sequentially.
4. Keep the script body in a sibling `.js` file and reference it with `Now.include('./file.script.js')` for IDE support. Use an inline template literal only for a trivial one-liner, or when the script must interpolate a prior step's output (GEM interpolation is incompatible with `Now.include()`).
5. Default file location: put the `.now.ts` and its `.js` files under `src/fluent/atf/` (unless the app already keeps ATF tests elsewhere).
6. Inside the script body (all globals pre-injected — no imports):
   - Navigate first with a **relative** URL: `await sn_atf.navigate('/now/path')`.
   - Use `findBy*` for dynamic/async content (it polls), `getBy*` for content already present, `queryBy*` for conditional checks. Always `await` async queries.
   - Use top-level `await` directly; never leave an async wrapper un-awaited (silent false pass).
   - Strict mode: every query must resolve to exactly one element — disambiguate with `{ exact: true }`, `within()`, or `findAllBy*` + indexing.
   - Commit `now-*` text inputs after typing by blurring: `await user.tab()`.
   - Wrap element-state assertions in `await waitFor(() => expect(el)…)`. Never nest `findBy*` inside `waitFor()`. Put `timeout` in the query's opts object, not as a third argument.
   - Max script length is 8000 characters — split long workflows across steps.
7. Base queries on the **real rendered DOM** (roles/accessible names), not the authoring source — `now-*`/React components do not map 1:1 to HTML. Shadow DOM is pierced automatically.
8. Assert the real outcome (verify the persisted record with an `atf.server.*` step), not just a UI success message. Assert display values, not stored values. Grant each impersonated persona the roles/ACLs its actions require.
9. For multi-persona workflows, switch users with an `atf.server.impersonate()` step (its `user` is a sys_id) between `atf.uiTestScript.runTest()` steps; the within-script `sn_atf.impersonate('username')` takes a username.
