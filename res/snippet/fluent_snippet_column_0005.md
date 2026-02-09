```typescript
import { BasicImageColumn, StringColumn, Table } from '@servicenow/sdk/core'

export const x_myapp_brand_asset = Table({
    name: 'x_myapp_brand_asset',
    label: 'Brand Asset',
    schema: {
        name: StringColumn({ label: 'Name', mandatory: true }),
        logo: BasicImageColumn({
            label: 'Logo',
            default: Now.attach('images/default_logo.png'),
        }),
        icon: BasicImageColumn({
            label: 'Icon',
            default: Now.attach('images/default_icon.svg'),
        }),
        banner: BasicImageColumn({
            label: 'Banner Image',
        }),
    },
})
```
