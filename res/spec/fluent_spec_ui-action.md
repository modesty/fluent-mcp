#**Context:** UI Action API spec: define UI Actions [sys_ui_action] to enhance interactivity and customization in user interfaces. UI Actions include buttons, context menu items and related links on forms and lists. Use the dedicated `UiAction` construct for cleaner, type-safe UI Action definitions.

```typescript
import { UiAction } from '@servicenow/sdk/core';

// Creates a new UI Action (`sys_ui_action`) using the UiAction construct
UiAction({
    $id: '', // string | guid, mandatory - Unique identifier for the UI Action
    table: '', // string, mandatory - Table on which UI Action appears
    name: '', // string, mandatory - Name of the UI Action. It must be unique within the table
    actionName: '', // string, optional - Unique string that can be referenced in scripts
    active: true, // boolean, optional - If true, the UI Action is enabled
    
    // UI action on form view and related properties
    form: { // object, optional - UI action on form view and related properties
        showButton: false, // boolean, optional - Display as form button
        showLink: false, // boolean, optional - Display as form link
        showContextMenu: false, // boolean, optional - Display in form context menu
        style: '', // string, optional - 'primary' | 'destructive' | 'unstyled'
    },
    
    // UI action on list view and related properties
    list: { // object, optional - UI action on list view and related properties
        showButton: false, // boolean, optional - Display as list button
        showLink: false, // boolean, optional - Display as list link
        showContextMenu: false, // boolean, optional - Display in list context menu
        style: '', // string, optional - 'primary' | 'destructive' | 'unstyled'
        showListChoice: false, // boolean, optional - Display in list choice menu
        showBannerButton: false, // boolean, optional - Display as banner button on list
        showSaveWithFormButton: false, // boolean, optional - Display as save with form button
    },
    
    // Client side script and related properties
    client: { // object, optional - Client side script and related properties
        isClient: false, // boolean, optional - Set to true when using client-side script
        isUi11Compatible: false, // boolean, optional - Compatible with UI11 (List V2)
        isUi16Compatible: false, // boolean, optional - Compatible with UI16/Next Experience (List V3)
        onClick: '', // string, optional - Client-side function to execute on click
    },
    
    // UI action on workspace configuration and related properties
    workspace: { // object, optional - UI action on workspace configuration and related properties
        isConfigurableWorkspace: false, // boolean, optional - Enable for configurable workspace
        showFormButtonV2: false, // boolean, optional - Display as workspace form button
        showFormMenuButtonV2: false, // boolean, optional - Display as workspace form menu button
        clientScriptV2: '', // string, optional - Client-side script for workspace
    },
    
    // Display conditions - Control when UI Action is visible
    showInsert: false, // boolean, optional - Checked, the UI Action appears in insert
    showUpdate: false, // boolean, optional - Checked, the UI Action appears in update
    showQuery: false, // boolean, optional - Checked, the UI Action appears in insert, update, query or update multiple(bulk edit) mode
    showMultipleUpdate: false, // boolean, optional - Checked, the UI Action appears in insert, update, query or update multiple(bulk edit) mode
    
    // Scripts and conditions
    condition: '', // string, optional - A script or condition that determines whether the UI Action is visible
    script: '', // string | function, optional - Script runs automatically as part of the UI Action when the client calls it
        // Note: server module scripts (sys_module) can only be used on server-side UI Actions
        // Example: function(current) { gs.addInfoMessage('Action executed'); }
    
    // Additional properties
    comments: '', // string, optional - Text field used by developers and admins to add internal notes
    messages: [], // string[], optional - Messages field holds user facing messages or notification text that the UI Action may display when it executes
    hint: '', // string, optional - A tooltip or hover text that appears when users hover their mouse pointer over
    order: 100, // number, optional - Determines the order in which the UI Action appears. Lower values show first
    isolateScript: false, // boolean, optional - Checked, script in a UI Action runs in an isolated script
    overrides: '', // string | Record<'sys_ui_action'>, optional - Action being overridden by the current record
    roles: [], // (string | Role)[], optional - Stores roles associated with a UI Action, defining which users can see or execute that UI Action based on their roles
    includeInViews: [], // string[], optional - Specifies views in which UI action to be included
    excludeFromViews: [], // string[], optional - Specifies views from which UI action to be excluded
}): UiAction; // returns a UiAction object
```
