```typescript
import { DomainIdColumn, Table, TranslatedFieldColumn, TranslatedTextColumn } from '@servicenow/sdk/core'

// A custom global table (u_ prefix); the platform's business_calendar_group cannot be redefined by an app.
// `sys_domain` is the platform's standard domain-separation field name, so the DomainIdColumn keeps it.
export const u_business_calendar_group = Table({
    name: 'u_business_calendar_group',
    label: 'Business Calendar Group',
    display: 'name',
    schema: {
        name: TranslatedFieldColumn({ label: 'Name', mandatory: true }),
        description: TranslatedTextColumn({}),
        sys_domain: DomainIdColumn({
            label: 'Domain',
            readOnly: true,
            plural: 'Domains',
            hint: 'Domain to which the Business Calendar Group belongs',
            default: 'global',
        }),
    },
})
```