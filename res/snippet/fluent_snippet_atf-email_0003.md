```typescript
import { Test } from '@servicenow/sdk/core'
import '@servicenow/sdk-core/global'
Test({
  $id: Now.ID['test_1_123456'],
  name: 'Email Sending and Validation Test',
  description: 'Test to generate an inbound email, validate the generated sys_email record, then validate an outbound email by subject',
  active: true,
  failOnServerError: true
}, (atf) => {
  // generateInboundEmail returns the snake_case output `output_email_record` (the sys_email sys_id)
  const inboundEmail = atf.email.generateInboundEmail({
    $id: 'step_1_abcdef',
    from: 't2t@pale.org',
    to: 'no-reply@pale.org',
    subject: 'email from text2fluent',
    body: 'this is a test email from text2fluent'
  })
  atf.server.recordValidation({
    $id: 'step_2_mnopqr',
    table: 'sys_email',
    recordId: inboundEmail.output_email_record, // input camelCase, output snake_case
    fieldValues: 'subject=email from text2fluent',
    assert: 'record_validated'
  })
  atf.email.validateOutboundEmail({
    $id: 'step_3_ghijkl',
    conditions: 'subject=email from text2fluent'
  })
})
```