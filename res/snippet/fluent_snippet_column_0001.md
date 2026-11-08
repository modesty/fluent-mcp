```typescript
import { DateTimeColumn, GenericColumn, ReferenceColumn, StringColumn, Table } from '@servicenow/sdk/core'

// A custom global table (u_ prefix) modeled on the platform's script execution history;
// a platform table such as sys_script_execution_history cannot be redefined by an app.
export const u_script_execution_history = Table({
    name: 'u_script_execution_history',
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
        script: GenericColumn({ columnType: 'script_plain' }),
        result: StringColumn({ maxLength: 65000 }), // long text such as script output; maxLength takes a number
    },
})
```