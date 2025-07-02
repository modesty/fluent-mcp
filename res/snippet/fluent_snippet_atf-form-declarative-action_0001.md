```typescript
// Fluent ATF Test
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['ensure_submit_button_is_visible'],
  name: 'Ensure Submit button is visible',
  description: 'Test to ensure the Submit button is visible and Update button is not visible on the new incident form, then click Reset declarative action',
  active: true,
  failOnServerError: true
}, (atf) => {
  atf.form.openNewForm({
    $id: 'step_1_3f2d4a',
    table: "incident",
    formUI: 'standard_ui',
    view: '',
  })
  atf.form.uiActionVisibility({
    $id: 'step_2_4e5f6b',
    table: "incident",
    formUI: 'standard_ui',
    visible: ["0009ff1e7744111020da364c7d5a9933"],
    notVisible: ["08d9fe99770670107db6a2ad8e5a99e6"],
  })
  atf.form.clickDeclarativeAction({
    $id: 'step_3_7g8h9i',
    table: "incident",
    declarativeAction: "0152e2f453922010c5e2ddeeff7b121c",
    assert: 'form_submitted_to_server',
    formUI: 'standard_ui',
  })
})
```
