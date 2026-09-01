# **Context:** TestSuite API spec (SDK v4.11.0+): Groups existing ATF `Test()` records into a named, orderable, optionally nested collection. One `TestSuite()` call writes the suite row (`sys_atf_test_suite`) plus one membership row (`sys_atf_test_suite_test`) per entry in `tests`. Import `TestSuite` from `@servicenow/sdk/core`. **Authoring only** — it produces suite/membership metadata and never triggers, schedules, or runs anything; run suites through ATF's UI, its scheduler, or CI/CD (in this MCP server, `cicd_fluent_test` with `target: 'testsuite'`). Membership comes from **either** a static `tests` list **or** a dynamic `testFilter`, never both — the two forms are shown as separate calls below for exactly that reason.

```typescript
// ══ FORM 1 of 2 — STATIC MEMBERSHIP (the common case) ══
// Membership is an explicit `tests` list. Do NOT add `testFilter` to this call; see Form 2.
TestSuite({
  $id: Now.ID['test_suite_1'], // Now.ID | string | number, mandatory - identity. Pass a raw 32-char sys_id to edit an existing suite in place
  name: 'Smoke Suite', // string, mandatory - suite name, shown in the ATF Test Suites list and picker
  active: true, // boolean, optional (default true) - whether the suite is available to run
  description: '', // string, optional - what this suite covers

  // ── MEMBERSHIP (static): entries in RUN ORDER. Order comes from array position, matching how
  //    Test()'s own steps derive order. Two entry forms may be mixed freely in one array. ──
  tests: [
    // Entry form A — bare reference: a Test(...) return value, or a raw 32-char sys_id string.
    // Always runs with abortOnFailure: false.
    someTest,
    'a1b2c3d4e5f67890a1b2c3d4e5f67890',

    // Entry form B — object form, for the two overrides:
    {
      test: someOtherTest, // ReturnType<typeof Test> | string, mandatory - the test to include
      abortOnFailure: true, // boolean, optional (default false) - stop the REST of the suite
        // immediately if this test fails. IGNORED by ATF's cloud/parallel test runner, which always
        // runs every test in the suite regardless — informational only there
      order: 200, // number, optional - PIN this entry's numeric order instead of deriving it from
        // array position. An escape hatch for preserving custom/gapped values (100, 200, 300...) when
        // adopting Fluent for a suite that already has them. Pinned and derived entries can mix;
        // a collision with another entry's FINAL order emits a build-time hint, because ATF does not
        // guarantee run order between ties
    },
  ],
  // Declaring the same test twice (by RESOLVED sys_id, regardless of which reference form is used)
  // is a hard build-time error.

  // ── NESTING (valid on either form) ──
  parent: parentSuite, // TestSuite | string, optional - parent suite to nest under (sys_atf_test_suite.parent).
    // A TestSuite(...) reference must be declared BEFORE this suite references it (normal
    // declare-before-use), which structurally rules out a cycle. A raw sys_id equal to this suite's own
    // $id is rejected at build time; a LONGER cycle built from raw sys_id strings across several suites
    // is NOT statically detected by Fluent and is caught by the platform on save

  // ── Cross-cutting (from Now.Internal.WithIdAndMetadata; valid on either form) ──
  protectionPolicy: 'read', // 'read' | 'protected', optional - post-install developer access.
    // 'read' = others see but cannot change; 'protected' = others cannot change. Omit to allow customization
  // $override: { ... } // optional - escape hatch for sys_* / sys_domain columns
  // NOTE: TestSuite does NOT accept `$meta` — no installMethod, no useEsLatest
})

// ══ FORM 2 of 2 — DYNAMIC MEMBERSHIP ══
// ⚠️ MUTUALLY EXCLUSIVE WITH FORM 1. Pick one mechanism per suite and omit the other property
// entirely. The platform ALLOWS both and Fluent only emits a build-time hint, but they CONFLICT:
// ATF re-syncs the sys_atf_test_suite_test rows from `testFilter` every time the suite is saved on
// the instance, so a test you listed by hand that does not match the filter can be SILENTLY REMOVED.
TestSuite({
  $id: Now.ID['test_suite_2'],
  name: 'All Smoke Tests',
  description: 'Membership is filter-driven; no tests are listed by hand',

  // ── MEMBERSHIP (dynamic) ──
  testFilter: 'active=true^nameSTARTSWITHsmoke', // string, optional - encoded query against
    // `sys_atf_test`; maps to sys_atf_test_suite.input_filter. ATF evaluates it and syncs the
    // sys_atf_test_suite_test rows whenever the suite is SAVED ON THE INSTANCE — this sync happens on
    // the platform, NOT during a Fluent build, so a fresh build shows no membership rows from it.
    // Do not read an empty membership list right after deploy as a build failure.
  // NOTE: no `tests` key here, deliberately — that is what makes this form safe.
})
```
