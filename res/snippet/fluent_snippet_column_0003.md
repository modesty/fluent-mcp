```typescript
import { DurationColumn, EmailColumn, FloatColumn, GuidColumn, HtmlColumn, JsonColumn, Password2Column, Table, TimeColumn, UrlColumn } from '@servicenow/sdk/core'

export const x_myapp_device_config = Table({
    name: 'x_myapp_device_config',
    label: 'Device Configuration',
    schema: {
        device_guid: GuidColumn({ label: 'Device GUID', maxLength: 36, mandatory: true }),
        admin_email: EmailColumn({ label: 'Admin Email', mandatory: true }),
        docs_url: UrlColumn({ label: 'Documentation URL' }),
        config_data: JsonColumn({ label: 'Configuration Data' }),
        description: HtmlColumn({ label: 'Description' }),
        price: FloatColumn({ label: 'Price', scale: 2 }),
        api_key: Password2Column({ label: 'API Key' }),
        maintenance_window: DurationColumn({
            label: 'Maintenance Window',
            default: Duration({ hours: 4 }),
        }),
        daily_check_time: TimeColumn({
            label: 'Daily Check Time',
            default: Time({ hours: 9, minutes: 0, seconds: 0 }, 'UTC'),
        }),
    },
})
```
