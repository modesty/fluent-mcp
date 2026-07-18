# Test a custom UI component with a UI Test Script (TestingLibrary) step in ServiceNow ATF

```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['atf-ui-test-script_0001'], // fill in a valid GUID string or the name of the test
  name: 'Custom UI: Submit Button Workflow', // string
  description: 'Navigates to the app home, fills the Description field, clicks Submit, and asserts the confirmation appears — the success path of the submit workflow', // string
  active: true, // boolean
  failOnServerError: true // boolean
}, (atf) => {
  // Runs a TestingLibrary test body in the client test runner. In a real project prefer
  // script: Now.include('./submit_button_test.script.js') to keep the body in a real .js file
  // (IDE syntax highlighting); an inline template literal is used here for a self-contained example.
  atf.uiTestScript.runTest({
    $id: Now.ID['atf-ui-test-script_0001_step1'], // id the test step
    script: `
      await sn_atf.navigate('/now/my-app/home')

      const descInput = await screen.findByLabelText('Description')
      await user.type(descInput, 'ATF test submission')
      await user.tab() // commit a now-* input by blurring (it commits on change, not per keystroke)

      const submitBtn = await screen.findByRole('button', { name: 'Submit', exact: true })
      await user.click(submitBtn)

      const confirmation = await screen.findByText('Submitted successfully', { timeout: 10000 })
      await waitFor(() => expect(confirmation).toBeVisible())
    `,
  })
})
```
