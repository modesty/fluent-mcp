# defines a new table that extends the sys_metadata table and includes various columns with different properties. The table is designed to configure FX currency settings, specifying the number of digits to display, the currency to display, the rate table to use, and the reference currency to use for conversions.
```typescript
import { Table, StringColumn, TableNameColumn, ReferenceColumn, FieldNameColumn,  } from "@servicenow/sdk/core";

export const fx_configuration = Table({
    name: 'fx_configuration',
    label: 'FX Currency Configuration',
    audit: true,
    extends: 'sys_metadata',
    schema: {
        display_digits: StringColumn({
            label: 'Display Digits',
            hint: 'The number of digits to display in lists/reports',
            dropdown: 'dropdown_without_none',
            default: '-1',
            choices: {
                0: { label: '0', sequence: 0 },
                1: { label: '1', sequence: 1 },
                2: { label: '2', sequence: 2 },
                3: { label: '3', sequence: 3 },
                4: { label: '4', sequence: 4 },
                5: { label: '5', sequence: 5 },
                6: { label: '6', sequence: 6 },
                7: { label: '7', sequence: 7 },
                8: { label: '8', sequence: 8 },
                9: { label: '9', sequence: 9 },
                10: { label: '10', sequence: 10 },
                11: { label: '11', sequence: 11 },
                12: { label: '12', sequence: 12 },
                '-1': { label: 'Currency Default', sequence: -1 },
            },
        }),
        display_value: StringColumn({
            label: 'Display Value Currency',
            hint: 'The currency in which to display in lists/reports',
            dropdown: 'dropdown_without_none',
            default: 'default',
            choices: {
                default: { label: 'Use Global Default', sequence: 0 },
                as_entered: { label: 'Display As Entered', sequence: 1 },
                in_session_currency: { label: 'Display In Session Currency', sequence: 2 },
                in_reference_currency: { label: 'Display In Reference Currency', sequence: 3 },
            },
        }),
        rate_table: TableNameColumn({
            label: 'Conversion Rate Table',
            attributes: { tableChoicesScript: 'global.CurrencyConversionTableList', allow_public: true },
            hint: 'The rate table used for conversions',
            dynamicValueDefinitions: { type: 'dynamic_default' },
        }),
        reference_currency: ReferenceColumn({
            label: 'Reference Currency',
            use_reference_qualifier: 'simple',
            reference_qual_condition: 'active=true^EQ',
            hint: 'Reference Currency',
            referenceTable: 'fx_currency',
        }),
        conversion_date_source: FieldNameColumn({
            label: 'Conversion Date Source',
            attributes: { allow_null: true, types: 'glide_date_time', allow_references: true },
            hint: 'Dotwalked field on target table used to set conversion date',
            dynamicValueDefinitions: { type: 'dependent_field', columnName: 'target_table' },
        }),
        target_table: TableNameColumn({
            label: 'Table',
            mandatory: true,
            hint: 'The table containing the currency field',
        }),
        target_field: FieldNameColumn({
            label: 'Field',
            attributes: { fieldChoicesScript: 'FxCurrencyConfigFieldListGenerator' },
            mandatory: true,
            hint: 'The name of the currency field',
            dynamicValueDefinitions: { type: 'dependent_field', columnName: 'target_table' },
        }),
        rate_filter_target_table_field: FieldNameColumn({
            label: 'Target Table Field',
            attributes: { allow_null: true, allow_references: true },
            hint: 'Filter rates based on this dotwalked field in target table matching a field in the rate table',
            dynamicValueDefinitions: { type: 'dependent_field', columnName: 'target_table' },
        }),
        rate_filter_rate_table_field: FieldNameColumn({
            label: 'Rate Table Field',
            attributes: { allow_null: true },
            hint: 'Filter rates based on this field in rate table matching a field in the target table',
            dynamicValueDefinitions: { type: 'dependent_field', columnName: 'rate_table' },
        }),
        aggregation_source: StringColumn({
            label: 'Aggregation Source',
            hint: 'The values to aggregate in GlideAggregate/reports',
            dropdown: 'dropdown_without_none',
            default: 'default',
            choices: {
                default: { label: 'Use Global Default', sequence: 0 },
                as_entered: { label: 'As Entered values', sequence: 1 },
                reference: { label: 'Reference values', sequence: 2 },
            },
        }),
        reference_currency_source: FieldNameColumn({
            label: 'Reference Currency Source',
            attributes: { allow_null: true, types: 'string', reference_types: 'fx_currency', allow_references: true },
            hint: 'Dotwalked field on target table used to set reference currency',
            dynamicValueDefinitions: { type: 'dependent_field', columnName: 'target_table' },
        }),
    },
})
```
