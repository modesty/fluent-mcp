# Function: CatalogUiPolicy(config)

Creates a Catalog UI Policy (`catalog_ui_policy`) — conditionally shows, hides, or sets variables
on a catalog item or variable set based on a condition.

## Parameters

### config

`CatalogUiPolicyProps`

Catalog UI Policy configuration — condition, actions, target item or variable set.

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **shortDescription** (required): `string`
  Short description of the UI policy

- **actions** (optional): `CatalogUiPolicyAction[]`
  Actions to take when the policy is triggered
  - **variableName** (required): `string | VariableReference` -- Name of the variable this action applies to
  - **visible** (optional): `boolean` -- Whether the field should be visible
  - **mandatory** (optional): `boolean` -- Whether the field should be mandatory
  - **readOnly** (optional): `boolean` -- Whether the field should be disabled
  - **cleared** (optional): `boolean` -- Whether the field should be cleared when the policy is triggered
  - **value** (optional): `string` -- Value to set when the policy is triggered
  - **valueAction** (optional): `'clearValue' | 'setValue'` -- Action to take on the field value
  - **order** (optional): `number` -- Order in which the action should be executed
  - **variableMessageType** (optional): `'info' | 'warning' | 'error'` -- Type of field message to display
  - **variableMessage** (optional): `string` -- Message to display on the field

- **active** (optional): `boolean`
  Whether the UI policy is active

- **appliesOnCatalogItemView** (optional): `boolean`
  Whether the policy applies when viewing the catalog item

- **appliesOnCatalogTasks** (optional): `boolean`
  Whether the policy applies on catalog tasks

- **appliesOnRequestedItems** (optional): `boolean`
  Whether the policy applies on requested items

- **appliesOnTargetRecord** (optional): `boolean`
  Whether the policy applies on the target record

- **appliesTo** (optional): `'item' | 'set'`
  The applies to the policy.

- **catalogCondition** (optional): `string`
  Condition to determine when the policy applies to the catalog

- **catalogItem** (optional): `string | CatalogItem`
  The catalog item the policy applies to. Mutually exclusive with variableSet.

- **description** (optional): `string`
  Detailed description of the UI policy

- **executeIfFalse** (optional): `string`
  Script to execute when the policy condition is false

- **executeIfTrue** (optional): `string`
  Script to execute when the policy condition is true

- **global** (optional): `boolean`
  Whether the UI policy applies globally

- **isolateScript** (optional): `boolean`
  Whether to isolate the script execution context

- **onLoad** (optional): `boolean`
  Whether the UI policy runs on page load

- **order** (optional): `number`
  Order in which the policy should be evaluated

- **reverseIfFalse** (optional): `boolean`
  Whether to reverse the policy condition logic

- **runScripts** (optional): `boolean`
  Whether the UI policy runs scripts

- **runScriptsInUiType** (optional): `'desktop' | 'mobileOrServicePortal' | 'all'`
  UI type(s) where the policy should run

- **variableSet** (optional): `string | VariableSet`
  The variable set the policy applies to. Mutually exclusive with catalogItem.

- **vaSupported** (optional): `boolean`
  Whether the policy is supported for virtual agents



## Examples

### Basic CatalogUiPolicy

Create a simple catalog UI policy for a catalog item

```typescript
// Source: packages/api/tests/service-catalog-plugin/catalog-ui-policy/catalog-ui-policy-plugin.test.ts
/**
 * @title Basic CatalogUiPolicy
 * @description Create a simple catalog UI policy for a catalog item
 */

import { CatalogUiPolicy } from '@servicenow/sdk/core'

export const BasicCatalogUiPolicy = CatalogUiPolicy({
    $id: Now.ID['basic_catalog_policy'],
    catalogItem: 'basic_catalog_item',
    shortDescription: 'Basic catalog UI policy',
})

```

### CatalogUiPolicy with Actions

Create a catalog UI policy with variable actions for visibility, read-only, and mandatory

```typescript
// Source: packages/api/tests/service-catalog-plugin/catalog-ui-policy/catalog-ui-policy-plugin.test.ts
/**
 * @title CatalogUiPolicy with Actions
 * @description Create a catalog UI policy with variable actions for visibility, read-only, and mandatory
 */

import { CatalogUiPolicy } from '@servicenow/sdk/core'

export const ActionsCatalogUiPolicy = CatalogUiPolicy({
    $id: Now.ID['catalog_ui_policy_with_actions'],
    catalogItem: 'catalog_item_2',
    shortDescription: 'Catalog UI policy with actions',
    actions: [
        {
            variableName: 'var_description',
            visible: true,
            readOnly: true,
            mandatory: true,
        },
        {
            variableName: 'var_urgency',
            visible: true,
            mandatory: true,
            variableMessageType: 'error',
            variableMessage: 'This field is required',
            valueAction: 'setValue',
            order: 200,
            value: 'default urgency value',
        },
    ],
})

```

### CatalogUiPolicy with Scripts

Create a catalog UI policy with conditional scripts and catalog conditions

```typescript
// Source: packages/api/tests/service-catalog-plugin/catalog-ui-policy/catalog-ui-policy-plugin.test.ts
/**
 * @title CatalogUiPolicy with Scripts
 * @description Create a catalog UI policy with conditional scripts and catalog conditions
 */

import { CatalogUiPolicy } from '@servicenow/sdk/core'

export const ScriptedCatalogUiPolicy = CatalogUiPolicy({
    $id: Now.ID['catalog_ui_policy_with_scripts'],
    catalogItem: 'catalog_item_1',
    shortDescription: 'Catalog UI policy with scripts',
    runScripts: true,
    runScriptsInUiType: 'mobileOrServicePortal',
    executeIfTrue: 'function onCondition() { g_form.addErrorMessage("Error"); }',
    executeIfFalse: 'function onCondition() { g_form.clearMessages(); }',
    catalogCondition: 'var_short_descriptionENDSWITH^EQ',
    global: true,
    reverseIfFalse: true,
    isolateScript: true,
})

```

