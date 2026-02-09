```typescript
import { FieldListColumn, SlushBucketColumn, Table, TableNameColumn, TemplateValueColumn } from '@servicenow/sdk/core'

export const x_myapp_report_template = Table({
    name: 'x_myapp_report_template',
    label: 'Report Template',
    schema: {
        target_table: TableNameColumn({ label: 'Target Table', mandatory: true }),
        display_fields: FieldListColumn({
            label: 'Display Fields',
            dependent: 'target_table',
            default: FieldList<'incident'>(['number', 'short_description', 'priority', 'assigned_to.name']),
        }),
        default_values: TemplateValueColumn({
            label: 'Default Values',
            dependent: 'target_table',
            default: TemplateValue<'incident'>({ priority: 4, state: 1 }),
        }),
        assigned_roles: SlushBucketColumn({
            label: 'Assigned Roles',
            script: 'getRoles()',
            mandatory: true,
        }),
    },
})
```
