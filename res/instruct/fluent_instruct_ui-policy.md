# Instructions for Fluent UiPolicy API
Always reference the UiPolicy API specifications for more details.
1. Import `UiPolicy` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`. The `shortDescription` field is mandatory and must be a non-empty string.
2. The `actions` array controls field visibility, mandatory, and read-only states. Use `'ignore'` for `visible`, `readOnly`, and `mandatory` to leave the current state unchanged. Use boolean `true`/`false` to explicitly set the state.
3. Set `reverseIfFalse: true` to automatically reverse all actions when the condition becomes false. This is the most common pattern for dynamic form behavior, avoiding the need for separate `scriptFalse` logic.
4. The `runScripts` property must be set to `true` for `scriptTrue` and `scriptFalse` to execute. Without `runScripts: true`, the scripts are ignored even if provided.
5. The `relatedListActions` array controls visibility of related lists on the form. The `list` property supports three formats: GUID references using `'REL:sys_id'`, parent-child relationships using `'parent_table.child_table'`, or direct string references.
6. Set `onLoad: true` to execute the UI Policy when the form first loads. When `false`, the policy only runs when field values change. Use `onLoad: true` for policies that need to set initial field states.
7. The `uiType` property controls which user interface the policy targets: `'desktop'` for standard UI, `'mobile-or-service-portal'` for mobile and portal, or `'all'` for both.
8. Use `fieldMessage` and `fieldMessageType` in actions to display inline messages on fields. Valid message types are `'error'`, `'info'`, `'warning'`, and `'none'` (to clear a message).
