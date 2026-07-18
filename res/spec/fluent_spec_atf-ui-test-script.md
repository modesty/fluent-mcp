#**Context:** UI Test Script (TestingLibrary) ATF API spec (SDK v4.9.0+). The `atf.uiTestScript.runTest()` step runs a TestingLibrary test body in the client test runner to test **custom UI components** — Angular/React widgets embedded in workspaces, custom SPAs or UI-page apps, and `now-*` web components (custom elements with shadow DOM). Use it only when a UI cannot be tested through the standard `atf.form.*` or `atf.catalog.*` steps. The script body runs in an async context with all API globals injected — no imports are needed inside the script.
```typescript
// Fluent ATF Test with a UI Test Script (TestingLibrary) step.
// Imports (shown in the shared ATF scaffold): import { Test } from '@servicenow/sdk/core'; import '@servicenow/sdk/global'
Test(
  {
    $id: Now.ID[''], // string | guid, mandatory - unique test id
    name: '', // string, mandatory - e.g. 'Custom UI: <Workflow Name>'
    description: '', // string, mandatory - what it validates AND how (name the component, action, and assertion)
    active: true, // boolean, mandatory
  },
  (atf) => {
    // Runs a TestingLibrary test script in the client test runner.
    atf.uiTestScript.runTest({
      $id: Now.ID[''], // string | guid, mandatory - unique step id
      script: Now.include('./my_workflow_test.script.js'), // string | ReturnType<typeof Now.include>, mandatory
        // Prefer Now.include('./file.script.js') to keep the body in a real .js file (IDE support).
        // Use an inline template literal ONLY for trivial one-liners or when interpolating a prior step's output.
        // Max 8000 characters. `await` is supported. No imports needed — all globals are injected.
    }): void
  }
)

// ─── Script body globals (available inside `script`, NO imports) ───
// screen  — DOM queries. Prefixes: getBy* (sync, immediately present), findBy* (async, polls — for dynamic content),
//           queryBy* (async, null if 0 matches — conditional checks), getAllBy* / findAllBy* / queryAllBy* (arrays).
//           Suffixes: ByRole, ByText, ByLabelText, ByPlaceholderText, ByTestId, ByDisplayValue, BySelector, ByAltText, ByTitle.
//           Query options go in the opts object: findByRole('button', { name: 'Submit', exact: true, timeout: 15000 }).
//           Strict mode: every getBy*/findBy*/queryBy* must resolve to exactly ONE element. Shadow DOM is pierced automatically.
// user    — interactions (element is the first argument): click, dblClick, type, clear, selectOptions, deselectOptions,
//           upload, hover, unhover, keyboard, tab, copy, cut, paste. (No .fill/.impersonate/.navigate/.evaluate.)
// sn_atf  — ServiceNow APIs: navigate(url) (prefer relative), reload, goBack, goForward, evaluate(fn) (access g_form/g_user),
//           impersonate(userName) (username OR sys_id; auto-reverts at step end), waitForElementToBeRemoved(el, opts),
//           delay(ms) (last resort), querySelector/querySelectorAll/getActiveElement (shadow-piercing), upload helpers.
// expect  — element assertions (sync, throw): toBeVisible, toBeEnabled, toBeDisabled, toBeChecked, toHaveTextContent,
//           toHaveValue, toHaveAttribute, toHaveFocus, toBeInTheDocument, ... (invert with .not); plus plain-value
//           assertions: toBe, toEqual, toContain, toMatch, toHaveLength, toBeGreaterThan(OrEqual), ...
// waitFor(cb, { timeout, interval }) — retries cb until it stops throwing. Wrap element-state assertions in it by default.
//           NEVER nest findBy* inside waitFor() (findBy* already polls).
// within(el) — scoped Screen (all query variants). Does NOT cross a <slot> boundary.
// steps(stepSysId) — prior-step output, supports dotwalking (steps(id).record_id). Use == for string comparison.
// params(name) — parameterized-test value.

// ─── Multi-persona (impersonation) ───
// Within a single script: `await sn_atf.impersonate('username')` (auto-reverts at step end).
// Across steps: place an `atf.server.impersonate({ $id, user: '<sys_user sys_id>' })` step BETWEEN uiTestScript steps
//   (that step's `user` is a reference field — a sys_id, NOT a username). Split the script at every persona boundary.

// ─── Passing data between steps ───
// Interpolate a prior step return value's PROPERTY ACCESS in an inline template literal; the build converts it to a GEM
// expression the ATF framework substitutes at run time. Now.include() cannot be used when the script needs interpolation.
//   const insert = atf.server.recordInsert({ $id: Now.ID['ins'], table: 'sn_travel_request', fieldValues: { short_description: 'x' } })
//   atf.uiTestScript.runTest({ $id: Now.ID['view'], script: `await sn_atf.navigate('/now/app/record/' + '${insert.record_id}')` })
// Do NOT interpolate module-level constants or external (DB-lookup) values — write those as inline literals.
```
