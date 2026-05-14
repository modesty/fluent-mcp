# Inbound Email Action API example: auto-reply to inbound emails with HTML body and a server-side condition
```typescript
import { InboundEmailAction } from '@servicenow/sdk/core'

InboundEmailAction({
    $id: Now.ID['auto_reply_out_of_hours'],
    name: 'Auto-reply outside business hours',
    description: 'Sends an auto-reply when emails arrive outside 09:00-17:00 site time',
    action: 'reply_email',
    type: 'new',
    active: true,
    order: 50,
    // Condition runs server-side; return true to send the reply.
    // In a real project, prefer Now.include('./auto-reply-condition.js') for IDE support.
    conditionScript: `
(function shouldReply() {
    var hour = new GlideDateTime().getNumericValue();
    var localHour = new Date(hour).getHours();
    return localHour < 9 || localHour >= 17;
})();
`,
    replyEmail: '<p>Thank you for your message.</p><p>Our support team replies during business hours (09:00–17:00 local).</p><p>If this is urgent, call our hotline.</p>',
})
```
