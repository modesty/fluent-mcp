# **Context:** VariableSet API spec: Used to create a Variable Set (`item_option_new_set`) — a reusable, named collection of catalog variables that can be attached to multiple CatalogItems and CatalogItemRecordProducers. Promotes variable reuse and consistent forms across catalog items.

```typescript
import { VariableSet } from '@servicenow/sdk/core'
// Variable types are imported separately — see catalog-variable spec for all types
import { SingleLineTextVariable, SelectBoxVariable, ReferenceVariable, CheckboxVariable } from '@servicenow/sdk/core'

// Creates a new Variable Set (`item_option_new_set`)
VariableSet({
    $id: Now.ID['my_variable_set'], // string | Now.ID key, mandatory — unique identifier

    // ─── Required ───
    title: '',              // string, mandatory — display title shown above the variable group on the form

    // ─── Optional ───
    internalName: '',       // string, optional — auto-generated from title if not provided; used in scripts
    name: '',               // string, optional — additional name field
    description: '',        // string, optional — description of the variable set's purpose
    type: 'singleRow',      // 'singleRow' | 'multiRow', optional — layout type, default: 'singleRow'
    layout: 'normal',       // 'normal' | '2down' | '2across', optional — column layout style, default: 'normal'
    order: 100,             // number, optional — display order when used in a catalog item, default: 100
    displayTitle: false,    // boolean, optional — whether to display the title heading on the form, default: false
    setAttributes: '',      // string, optional — additional configuration attributes
    version: 1,             // number, optional — version number

    // ─── Access control ───
    readRoles: [],          // (string | Role)[], optional — roles that can read this variable set
    writeRoles: [],         // (string | Role)[], optional — roles that can modify this variable set
    createRoles: [],        // (string | Role)[], optional — roles that can create instances

    // ─── Variables ───
    variables: {            // Record<string, VariableType>, optional — variable definitions
        // Key = internal variable name (used in scripts, g_form calls, and policy references)
        // Value = a variable function call (see catalog-variable spec for all types)
        contact_name: SingleLineTextVariable({
            question: 'Contact Name',
            order: 100,
            mandatory: true,
        }),
        department: SelectBoxVariable({
            question: 'Department',
            order: 200,
        }),
        manager: ReferenceVariable({
            question: 'Direct Manager',
            referenceTable: 'sys_user',
            order: 300,
            mandatory: false,
        }),
        is_urgent: CheckboxVariable({
            question: 'Mark as Urgent',
            order: 400,
            defaultValue: false,
        }),
    },
}): VariableSet // returns a VariableSet object (with typed variables accessible via .variables)
```
