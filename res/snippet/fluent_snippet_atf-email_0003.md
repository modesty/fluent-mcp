```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['test_1_123456'],
  name: 'Email Sending and Validation Test',
  description: 'Test to send an email and validate it based on the subject',
  active: true,
  failOnServerError: true
}, (atf) => {
  const outputEmailRecord = atf.email.generateInboundEmail({
    $id: 'step_1_abcdef',
    from: 't2t@pale.org',
    to: 'no-reply@pale.org',
    subject: 'email from text2fluent',
    body: 'this is a test email from text2fluent'
  })
  atf.email.validateOutboundEmail({
    $id: 'step_2_ghijkl',
    conditions: 'subject=email from text2fluent'
  })
})
```