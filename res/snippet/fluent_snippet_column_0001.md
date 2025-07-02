```typescript
import { DateTimeColumn, GenericColumn, ReferenceColumn, StringColumn, Table } from '@servicenow/sdk/core'

export const sys_script_execution_history = Table({
    name: 'sys_script_execution_history',
    label: 'Script Execution History',
    schema: {
        executed_by: ReferenceColumn({ attributes: { readonly_clickthrough: true }, referenceTable: 'sys_user' }),
        transaction: ReferenceColumn({
            attributes: { readonly_clickthrough: true },
            referenceTable: 'syslog_transaction',
        }),
        started: DateTimeColumn({}),
        finished: DateTimeColumn({}),
        rollback_context: ReferenceColumn({
            attributes: { readonly_clickthrough: true },
            referenceTable: 'sys_rollback_context',
        }),
        script: GenericColumn({ column_type: 'script_plain' }),
        result: StringColumn({ maxLength: 'xxlarge' as any }),
    },
})
```