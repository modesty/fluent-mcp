```typescript
// App scope: x_myapp
import { BasicImageColumn, StringColumn, Table } from '@servicenow/sdk/core'

// BasicImageColumn writes a field with internal_type `image`; users upload the image on each record.
// Do not set `default: Now.attach(...)` on a column: SDK 4.14.0 type-checks it but writes the literal
// `Symbol(NowAttachShape)` as the dictionary default and no sys_attachment. Now.attach() works in record
// data fields instead, e.g. Record({ table: 'sp_portal', data: { icon: Now.attach('./images/icon.png') } }).
export const x_myapp_brand_asset = Table({
    name: 'x_myapp_brand_asset',
    label: 'Brand Asset',
    schema: {
        name: StringColumn({ label: 'Name', mandatory: true }),
        logo: BasicImageColumn({
            label: 'Logo',
            mandatory: true,
        }),
        icon: BasicImageColumn({
            label: 'Icon',
            hint: 'Square image, shown in lists',
        }),
        banner: BasicImageColumn({
            label: 'Banner Image',
        }),
    },
})
```
