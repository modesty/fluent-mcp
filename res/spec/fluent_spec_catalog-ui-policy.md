# **Context:** CatalogUiPolicy API spec: Used to create a Catalog UI Policy (`catalog_ui_policy`) — dynamic form behavior rules for Service Catalog items. Controls variable visibility, mandatory state, and read-only state based on conditions. Similar to UiPolicy but specific to catalog forms.

```typescript
import { CatalogUiPolicy } from '@servicenow/sdk/core'

// Creates a new Catalog UI Policy (`catalog_ui_policy`)
CatalogUiPolicy({
    $id: Now.ID['my_catalog_ui_policy'], // string | Now.ID key, mandatory — unique identifier

    // ─── Required ───
    shortDescription: '',   // string, mandatory — brief description of what this policy does

    // ─── Target — one of catalogItem or variableSet (mutually exclusive) ───
    catalogItem: catalogItemRef,  // string | CatalogItem, optional — the catalog item this policy applies to
    variableSet: variableSetRef,  // string | VariableSet, optional — the variable set this policy applies to (mutually exclusive with catalogItem)
    appliesTo: 'item',      // 'item' | 'set', optional — scope: 'item' for catalog item scope, 'set' for variable set scope

    // ─── Behavior ───
    active: true,           // boolean, optional — whether the policy is active
    global: false,          // boolean, optional — apply globally across all catalog items
    onLoad: false,          // boolean, optional — run when the form loads (in addition to on field changes)
    reverseIfFalse: false,  // boolean, optional — automatically reverse actions when condition is false
    isolateScript: false,   // boolean, optional — run scripts in an isolated scope
    vaSupported: false,     // boolean, optional — whether policy applies in Virtual Agent conversations
    order: 100,             // number, optional — evaluation order (lower = first)
    description: '',        // string, optional — detailed description

    // ─── Condition ───
    catalogCondition: '',   // string, optional — condition expression; use variable references via variableSet.variables.varName
    // Example: `${myVariableSet.variables.is_urgent} === true`

    // ─── Where to apply ───
    appliesOnCatalogItemView: true,   // boolean, optional — apply when viewing the catalog item form
    appliesOnTargetRecord: false,     // boolean, optional — apply on the target record form
    appliesOnCatalogTasks: false,     // boolean, optional — apply on catalog tasks
    appliesOnRequestedItems: false,   // boolean, optional — apply on requested items

    // ─── Scripts (when runScripts: true) ───
    runScripts: false,      // boolean, optional — enable script execution
    runScriptsInUiType: 'desktop', // 'desktop' | 'mobileOrServicePortal' | 'all', optional — UI type for scripts
    executeIfTrue: '',      // string, optional — JavaScript script to run when condition is true
    executeIfFalse: '',     // string, optional — JavaScript script to run when condition is false

    // ─── Actions ───
    actions: [              // CatalogUiPolicyAction[], optional — field-level changes when condition is met
        {
            variableName: variableSetRef.variables.varName, // string | VariableReference, mandatory — variable to affect
            visible: true,      // boolean, optional — set variable visibility
            mandatory: false,   // boolean, optional — set variable as mandatory
            readOnly: false,    // boolean, optional — set variable as read-only
            cleared: false,     // boolean, optional — clear the variable value
            value: '',          // string, optional — set a specific value
            valueAction: 'setValue', // 'setValue' | 'clearValue', optional
            order: 100,         // number, optional — action execution order
            variableMessageType: 'info', // 'info' | 'warning' | 'error', optional
            variableMessage: '', // string, optional — message to display on the variable
        }
    ],
}): CatalogUiPolicyProps // returns a CatalogUiPolicyProps object
```
