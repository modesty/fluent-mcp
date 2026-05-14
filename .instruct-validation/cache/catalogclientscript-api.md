# Function: CatalogClientScript(config)

Creates a Catalog Client Script (`catalog_script_client`) for service catalog items. These client-side
scripts run in response to catalog form events such as `onLoad`, `onChange`, or `onSubmit`, enabling
dynamic form behavior like field validation, visibility toggling, and user feedback messages.

## Parameters

### config

`CatalogClientScriptProps<'onLoad' | 'onChange' | 'onSubmit'>`

Catalog Client Script configuration — event type, script, target item or variable set.

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **name** (required): `string`
  The name of the client script.

- **script** (required): `string`
  The script to run.

- **active** (optional): `boolean`
  Whether the script is active.

- **appliesOnCatalogItemView** (optional): `boolean`
  Whether the script applies on catalog item view.

- **appliesOnCatalogTasks** (optional): `boolean`
  Whether the script applies on catalog tasks.

- **appliesOnRequestedItems** (optional): `boolean`
  Whether the script applies on requested items.

- **appliesOnTargetRecord** (optional): `boolean`
  Whether the script applies on target record.

- **appliesTo** (optional): `'item' | 'set'`
  The applies to the script.

- **catalogItem** (optional): `string | CatalogItem | CatalogItemRecordProducer`
  The catalog item the script applies to. Mutually exclusive with variableSet.

- **global** (optional): `boolean`
  Whether the script is global.

- **isolateScript** (optional): `boolean`
  Whether the script is isolated.

- **publishedRef** (optional): `string`
  The published ref of the client script.

- **type** (optional): `'onLoad' | 'onChange' | 'onSubmit'`
  The type of the client script.

- **uiType** (optional): `CatalogClientScriptUIType` (`'desktop' | 'mobileOrServicePortal' | 'all'`)
  The ui type of the client script.

- **variableName** (optional): `string | AnyVariable`
  The catalog variable that triggers the script.
  This property applies only when the type property is set to `onChange`.

- **variableSet** (optional): `string | VariableSet`
  The variable set the script applies to. Mutually exclusive with catalogItem.

- **vaSupported** (optional): `boolean`
  Whether the script is VA supported.


## See

- https://www.servicenow.com/docs/bundle/zurich-api-reference/page/script/client-scripts/concept/c_CatalogClientScriptCreation.html#title_r_CatalogClientScriptConsid


## Examples

### CatalogClientScript - onChange

Create a catalog client script that runs when a variable changes

```typescript
// Source: packages/api/tests/service-catalog-plugin/xml/catalog-client-script/create/catalogclientscript0.now.ts
/**
 * @title CatalogClientScript - onChange
 * @description Create a catalog client script that runs when a variable changes
 */

import { CatalogClientScript } from '@servicenow/sdk/core'

export const OnChangeClientScript = CatalogClientScript({
    $id: Now.ID['onchange_client_script'],
    name: 'Handle Variable Change',
    type: 'onChange',
    script: `function onChange() {
    g_form.addInfoMessage('Variable value changed')
}`,
    catalogItem: 'test-catalog-item',
    variableName: 'variable-name',
    uiType: 'desktop',
    vaSupported: true,
})

```

### CatalogClientScript - onLoad

Create a catalog client script that runs on form load

```typescript
// Source: packages/api/tests/service-catalog-plugin/xml/catalog-client-script/create/catalogclientscript.now.ts
/**
 * @title CatalogClientScript - onLoad
 * @description Create a catalog client script that runs on form load
 */

import { CatalogClientScript } from '@servicenow/sdk/core'

export const OnLoadClientScript = CatalogClientScript({
    $id: Now.ID['onload_client_script'],
    name: 'Show Welcome Message',
    type: 'onLoad',
    script: `function onLoad(){ g_form.addInfoMessage("Welcome to this catalog item") }`,
    catalogItem: 'test-catalog-item',
    uiType: 'all',
})

```

### CatalogClientScript - onSubmit

Create a catalog client script that runs on form submission with applies flags

```typescript
// Source: packages/api/tests/service-catalog-plugin/xml/catalog-client-script/create/catalogclientscript2.now.ts
/**
 * @title CatalogClientScript - onSubmit
 * @description Create a catalog client script that runs on form submission with applies flags
 */

import { CatalogClientScript } from '@servicenow/sdk/core'

export const OnSubmitClientScript = CatalogClientScript({
    $id: Now.ID['onsubmit_client_script'],
    name: 'Validate on Submit',
    type: 'onSubmit',
    script: `function onSubmit() {
    if (!g_form.getValue('description')) {
        g_form.addErrorMessage('Please provide a description');
        return false;
    }
    return true;
}`,
    variableSet: 'variable-set-name',
    appliesTo: 'set',
    uiType: 'mobileOrServicePortal',
    active: true,
    appliesOnCatalogItemView: true,
    appliesOnRequestedItems: false,
    appliesOnCatalogTasks: false,
    appliesOnTargetRecord: false,
})

```

