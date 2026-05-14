# Inbound Email Action API example: create an incident when an email arrives, setting priority via static field action
```typescript
import { InboundEmailAction } from '@servicenow/sdk/core'

InboundEmailAction({
    $id: Now.ID['create_incident_from_email'],
    name: 'Create Incident From Email',
    description: 'Creates a P2 incident with caller and short description derived from the inbound email',
    action: 'record_action',
    table: 'incident',
    type: 'new',
    active: true,
    order: 100,
    // Map the email Subject → short_description via OOB sys_filter_option_dynamic record,
    // pull the Sender → caller_id, and set static priority + active.
    fieldAction: 'short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6^caller_idDYNAMIC2fd8e97bef3221002841f7f775c0fbc1^priority=2^active=true^EQ',
    stopProcessing: true,
})
```
