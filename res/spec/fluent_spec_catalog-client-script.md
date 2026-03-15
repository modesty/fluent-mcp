# **Context:** CatalogClientScript API spec: Used to create a Catalog Client Script (`catalog_script_client`) — a client-side JavaScript script that runs on a Service Catalog request form in response to form events (load, change, submit). Similar to a regular ClientScript but scoped to catalog items and variable sets.

```typescript
import { CatalogClientScript } from '@servicenow/sdk/core'

// Creates a new Catalog Client Script (`catalog_script_client`)
CatalogClientScript({
    $id: Now.ID['my_catalog_client_script'], // string | Now.ID key, mandatory — unique identifier

    // ─── Required ───
    name: '',               // string, mandatory — display name of the script
    script: '',             // string, mandatory — the JavaScript client-side script to execute

    // ─── Event type ───
    type: 'onLoad',         // 'onLoad' | 'onChange' | 'onSubmit', optional — when the script runs
    // 'onLoad'   — runs when the catalog form loads
    // 'onChange' — runs when a specific variable value changes (requires variableName)
    // 'onSubmit' — runs when the user submits the form; return false to prevent submission

    // ─── For onChange only ───
    variableName: '',       // string | VariableReference, optional — the variable that triggers the script on change

    // ─── Target — one of catalogItem or variableSet (mutually exclusive) ───
    catalogItem: catalogItemRef,  // string | CatalogItem | CatalogItemRecordProducer, optional
    variableSet: variableSetRef,  // string | VariableSet, optional (mutually exclusive with catalogItem)
    appliesTo: 'item',      // 'item' | 'set', optional — scope of the script

    // ─── Behavior ───
    active: true,           // boolean, optional — whether the script is active
    global: false,          // boolean, optional — apply globally
    isolateScript: false,   // boolean, optional — run script in isolated scope
    vaSupported: false,     // boolean, optional — run in Virtual Agent conversations

    // ─── Where to apply ───
    appliesOnCatalogItemView: true,   // boolean, optional — apply on the catalog item request form
    appliesOnRequestedItems: false,   // boolean, optional — apply on requested items view
    appliesOnCatalogTasks: false,     // boolean, optional — apply on catalog tasks
    appliesOnTargetRecord: false,     // boolean, optional — apply on the generated record

    // ─── UI type ───
    uiType: 'desktop',      // 'desktop' | 'mobileOrServicePortal' | 'all', optional — where to run the script

    publishedRef: '',       // string, optional — published reference sys_id
}): CatalogClientScriptProps // returns a CatalogClientScriptProps object
```
