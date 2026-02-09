# **Context:** UiPolicy API spec: Used to create a UI Policy that defines dynamic form behaviors to change field properties based on conditions. UI Policies can make fields mandatory, read-only, visible, hidden, or cleared when certain conditions are met (`sys_ui_policy`).

```typescript
// Creates a new UI Policy (`sys_ui_policy`)
UiPolicy({
 $id: '', // string | guid, mandatory - unique identifier for the record
 table: '', // string, optional - the table to which the UI Policy applies
 shortDescription: '', // string, mandatory - brief description of what the UI Policy does (must not be empty)
 active: true, // boolean, optional - whether the UI Policy is active
 global: false, // boolean, optional - whether the UI Policy applies globally across all applications
 onLoad: false, // boolean, optional - whether the UI Policy runs when the form loads (true) or only on field changes (false)
 reverseIfFalse: false, // boolean, optional - whether to automatically reverse actions when the condition is false
 inherit: false, // boolean, optional - whether the UI Policy is inherited by tables that extend this table
 conditions: '', // string, optional - a condition script or encoded query that determines when the UI Policy applies
 order: 100, // number, optional - execution order/priority; lower values execute first
 description: '', // string, optional - detailed description of the UI Policy
 uiType: 'desktop', // 'desktop' | 'mobile-or-service-portal' | 'all', optional - user interface to which the UI Policy applies
 isolateScript: false, // boolean, optional - whether to run scripts in an isolated scope
 view: '', // string | Record<'sys_ui_view'>, optional - view context where the UI Policy applies; if global is true, applies to all views
 runScripts: false, // boolean, optional - whether to run the scripts defined in scriptTrue/scriptFalse
 scriptTrue: '', // string, optional - JavaScript code that runs when the condition evaluates to true (requires runScripts: true)
 scriptFalse: '', // string, optional - JavaScript code that runs when the condition evaluates to false (requires runScripts: true)
 actions: [], // UiPolicyAction[], optional - list of field actions to perform when the condition is met
   // Each action object:
   //   field: '', // string, mandatory - the field to which the action applies (supports dot-walk notation)
   //   visible: true, // boolean | 'ignore', optional - whether the field should be visible; 'ignore' leaves unchanged
   //   readOnly: false, // boolean | 'ignore', optional - whether the field should be read-only (disabled); 'ignore' leaves unchanged
   //   mandatory: false, // boolean | 'ignore', optional - whether the field should be mandatory; 'ignore' leaves unchanged
   //   cleared: false, // boolean, optional - whether the field should be cleared when the condition is met
   //   value: '', // string, optional - value to set for the field
   //   fieldMessage: '', // string, optional - message to display for the field
   //   fieldMessageType: 'info', // 'error' | 'info' | 'warning' | 'none', optional - type of field message
 relatedListActions: [], // UiPolicyRelatedListAction[], optional - list of related list visibility controls
   // Each related list action object:
   //   list: '', // string | Record<'sys_relationship'>, optional - the related list identifier
   //     // Supports: 'REL:sys_id' for system relationships, 'parent_table.child_table' for parent-child, or direct string
   //   visible: true, // boolean | 'ignore', optional - whether the related list should be visible
}): UiPolicy // returns a UiPolicy object
```
