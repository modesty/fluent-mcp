# defines a new table that extends the sys_metadata table and includes various columns with different properties. . The table is designed to configure access observer settings, specifying which table and field to observe, and the start and end dates for the observation period.
```typescript
import { Table, TableNameColumn, FieldNameColumn, BooleanColumn, DateTimeColumn } from "@servicenow/sdk/core";

export const sys_data_ob_configuration = Table({
    name: 'sys_data_ob_configuration',
    label: 'Access Observer Configuration',
    extends: 'sys_metadata',
    schema: {
        table: TableNameColumn({
            attributes: { tableChoicesScript: 'DataObserverChoiceTables', show_table_names_on_label: true },
            mandatory: true,
            choice_type: '3',
            hint: 'Which table is being observed',
        }),
        column: FieldNameColumn({
            attributes: { fieldChoicesScript: 'DataObserverChoiceFields', show_field_names_on_label: true },
            mandatory: true,
            hint: 'The field to observe',
            dynamicValueDefinitions: { type: 'dependent_field', columnName: 'table' },
        }),
        active: BooleanColumn({ default: 'true' }),
        start_job_immediately: BooleanColumn({ label: 'Start job immediately', default: 'false' }),
        start_date: DateTimeColumn({
            label: 'Start date and time',
            mandatory: true,
            hint: 'Start of the observe period',
        }),
        end_date: DateTimeColumn({ label: 'End date and time', mandatory: true, hint: 'End of the observe period' }),
    },
})
```
