```typescript
import { DomainIdColumn, Table, TranslatedFieldColumn, TranslatedTextColumn } from '@servicenow/sdk/core'

export const business_calendar_group = Table({
    name: 'business_calendar_group',
    label: 'Business Calendar Group',
    display: 'name',
    schema: {
        name: TranslatedFieldColumn({ label: 'Name', mandatory: true }),
        description: TranslatedTextColumn({}),
        sys_domain: DomainIdColumn({
            label: 'Domain',
            read_only: true,
            plural: 'Domains',
            hint: 'Domain to which the Business Calendar Group belongs',
            default: 'global',
        }),
    },
})
```