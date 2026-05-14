# Function: VariableSet(config)

Creates a Variable Set (`item_option_new_set`) — a reusable collection of variables that can
be attached to one or more catalog items.

## Parameters

### config

`VariableSet<V>` - The variable set configuration object

Variable Set configuration — title, layout, variables, and role-based access.

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **title** (required): `string`
  Display title of the variable set (translated field)

- **createRoles** (optional): `(string | Role)[]`
  Roles that can create instances of this variable set
  An array of role names or Role references

- **description** (optional): `string`
  Description of the variable set

- **displayTitle** (optional, default: false): `boolean`
  Whether to display the title

- **internalName** (optional): `string`
  Optional : this is auto generated if not provided

- **layout** (optional, default: 'normal'): `'normal' | '2across' | '2down'`
  Layout style for the variable set
  Common values: 'normal', '2down', '2across'

- **name** (optional): `string`
  Optional name field

- **order** (optional, default: 100): `number`
  Display order of the variable set

- **readRoles** (optional): `(string | Role)[]`
  Roles that can read this variable set
  An array of role names or Role references

- **setAttributes** (optional): `string`
  Set attributes (additional configuration)

- **type** (optional, default: 'singleRow'): `'singleRow' | 'multiRow'`
  Type of variable set
  - 'singleRow': Single Row (default)
  - 'multiRow': Multi Row

- **variables** (optional): `Record<string, AnyVariable>`
  The variables for the variable set

- **version** (optional): `number`
  Version number of the variable set

- **writeRoles** (optional): `(string | Role)[]`
  Roles that can write/modify this variable set
  An array of role names or Role references



## Examples

### Basic VariableSet

Create a variable set with checkbox variables

```typescript
// Source: packages/api/tests/service-catalog-plugin/fluent/variable-set-variables/create/checkbox.now.ts
/**
 * @title Basic VariableSet
 * @description Create a variable set with checkbox variables
 */

import { VariableSet, CheckboxVariable } from '@servicenow/sdk/core'

export const BasicVariableSet = VariableSet({
    $id: Now.ID['checkbox_test_set'],
    title: 'Checkbox Options',
    variables: {
        premiumSupport: CheckboxVariable({
            question: 'Premium Support',
            order: 1,
            selectionRequired: true,
            pricingDetails: [
                {
                    amount: 100,
                    currencyType: 'USD',
                    field: 'price_if_checked',
                },
            ],
        }),
        rushDelivery: CheckboxVariable({
            question: 'Rush Delivery',
            order: 2,
            selectionRequired: false,
        }),
    },
})

```

### Multi-Row VariableSet

Create a multi-row variable set with checkbox variables

```typescript
// Source: packages/api/tests/service-catalog-plugin/fluent/variable-set-variables/create/checkbox.now.ts
/**
 * @title Multi-Row VariableSet
 * @description Create a multi-row variable set with checkbox variables
 */

import { VariableSet, CheckboxVariable } from '@servicenow/sdk/core'

export const MultiRowVariableSet = VariableSet({
    $id: Now.ID['multi_row_checkbox_set'],
    title: 'Multi-Row Checkbox Options',
    type: 'multiRow',
    variables: {
        premiumSupport: CheckboxVariable({
            question: 'Premium Support',
            order: 1,
            selectionRequired: true,
            pricingDetails: [
                {
                    amount: 100,
                    currencyType: 'USD',
                    field: 'price_if_checked',
                },
                {
                    amount: 50,
                    currencyType: 'GBP',
                    field: 'rec_price_if_checked',
                },
            ],
        }),
        extendedWarranty: CheckboxVariable({
            question: 'Extended Warranty',
            order: 2,
            pricingDetails: [
                {
                    amount: 200,
                    currencyType: 'EUR',
                    field: 'price_if_checked',
                },
            ],
        }),
        rushDelivery: CheckboxVariable({
            question: 'Rush Delivery',
            order: 3,
            selectionRequired: false,
        }),
    },
})

```

### VariableSet with SelectBox Variables

Create a variable set with selectbox variables using table-based and custom choices

```typescript
// Source: packages/api/tests/service-catalog-plugin/fluent/variable-set-variables/create/selectbox.now.ts
/**
 * @title VariableSet with SelectBox Variables
 * @description Create a variable set with selectbox variables using table-based and custom choices
 */

import { VariableSet, SelectBoxVariable } from '@servicenow/sdk/core'

export const SelectBoxVariableSet = VariableSet({
    $id: Now.ID['selectbox_test_set'],
    title: 'SelectBox Options',
    type: 'multiRow',
    variables: {
        // SelectBox sourced from an existing table/field
        priorityFromTable: SelectBoxVariable({
            question: 'Priority (From Table)',
            order: 1,
            choiceTable: 'incident',
            choiceField: 'priority',
        }),
        // SelectBox with custom choices and pricing
        supportLevel: SelectBoxVariable({
            question: 'Support Level',
            order: 2,
            choices: {
                basic: {
                    label: 'Basic Support',
                    sequence: 1,
                    inactive: false,
                    pricingDetails: [
                        {
                            field: 'misc',
                            amount: 50,
                            currencyType: 'USD',
                        },
                    ],
                },
                standard: {
                    label: 'Standard Support',
                    sequence: 2,
                    inactive: false,
                },
                premium: {
                    label: 'Premium Support',
                    sequence: 3,
                    inactive: false,
                },
            },
        }),
        // SelectBox with simple choices (no pricing)
        deliveryMethod: SelectBoxVariable({
            question: 'Delivery Method',
            order: 3,
            choices: {
                email: {
                    label: 'Email',
                    sequence: 1,
                    inactive: false,
                },
                download: {
                    label: 'Download',
                    sequence: 2,
                    inactive: false,
                },
                physical: {
                    label: 'Physical Media',
                    sequence: 3,
                    inactive: false,
                },
            },
        }),
    },
})

```

