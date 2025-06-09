# defines a new table extends the sys_metadata table and includes various columns with different properties
```typescript
import { Table, StringColumn, IntegerColumn, BooleanColumn, TranslatedTextColumn, GenericColumn, ChoiceColumn } from "@servicenow/sdk/core";

export const sys_formula_function = Table({
    index: [{ name: 'qualified_name', element: 'internal_name', unique: false }],
    name: get_table_name('sys_formula_function'),
    label: 'Formula Function',
    attributes: {
        update_synch: true,
    },
    extends: get_table_name('sys_metadata'),
    display: 'name',
    schema: {
        name: StringColumn({ label: 'Name', mandatory: true, maxLength: 255 }),
        internal_name: StringColumn({
            read_only: true,
            attributes: { update_exempt: true },
            mandatory: true,
            virtual_type: 'script',
            maxLength: 255,
            dynamic_value_definitions: {
                type: 'calculated_value',
                calculated_value: script`
             answer = (function() {
              var scope = current.sys_scope.scope;
              if (scope.nil())
               scope = "global";
             
               if (!current.name.nil())
                return scope + "." + current.name;
             
                 return "";
             })()`,
            },
        }),
        args_count: IntegerColumn({
            label: 'Minimum required arguments',
            mandatory: true,
            hint: 'Minimum number of arguments that are required for this function.',
            default: '0',
        }),
        extensible_args: BooleanColumn({
            label: 'Additional arguments',
            hint: 'Lets you add more arguments for this function.',
            default: 'false',
        }),
        additional_args_count: IntegerColumn({
            label: 'Maximum additional arguments allowed',
            hint: 'Maximum number of additional arguments accepted with this function.',
            default: '250',
        }),
        short_description: StringColumn({ label: 'Short description', mandatory: true, maxLength: 255 }),
        description: TranslatedTextColumn({ label: 'Description' }),
        system: BooleanColumn({ label: 'System Function', read_only: true, default: 'false' }),
        script: GenericColumn({ label: 'Script', column_type: 'script_plain' }),
        access: ChoiceColumn({
            label: 'Accessible from',
            dropdown: 'dropdown_without_none',
            default: 'public',
            choices: {
                public: { label: 'All application scopes', sequence: 1 },
                package_private: { label: 'This application scope only', sequence: 2 },
            },
        }),
        active: BooleanColumn({ label: 'Active', default: 'true' }),
    },
})
```
