# Instructions for Fluent UI Action API

Always reference the UI Action API specifications for more details.

## Import Statement

1. **Always import UiAction**: Use `import { UiAction } from '@servicenow/sdk/core'` - the dedicated `UiAction` construct provides better type safety than the generic `Record` API.

## Naming Conventions

1. **actionName prefix**: Every `actionName` should always be prefixed with 'sysverb_' (e.g., `sysverb_save`, `sysverb_custom_action`).
1. **Unique identifiers**: Use descriptive `$id` values with `Now.ID['unique_identifier']` to avoid conflicts.

## API Structure

1. **Nested objects**: The UiAction API uses nested objects for logical grouping: `form`, `list`, `client`, and `workspace` objects contain related properties.
1. **Optional objects**: All nested objects are optional - only include them when you need to set properties within them.

## Form Display Properties

1. **form object**: Use the `form` object to control form-level display: `{ showButton, showLink, showContextMenu, style }`.
1. **showButton**: Set `form.showButton: true` to display as form button.
1. **showLink**: Set `form.showLink: true` to display as related link on form.
1. **showContextMenu**: Set `form.showContextMenu: true` to display in form context menu (right-click).
1. **style**: Use `form.style` to set button styling: `'primary'`, `'destructive'`, or `'unstyled'`.

## List Display Properties

1. **list object**: Use the `list` object to control list-level display: `{ showButton, showLink, showContextMenu, style, showListChoice, showBannerButton, showSaveWithFormButton }`.
1. **showButton**: Set `list.showButton: true` to display as list button.
1. **showListChoice**: Set `list.showListChoice: true` to display in list choice menu.
1. **showBannerButton**: Set `list.showBannerButton: true` to display as banner button.
1. **showContextMenu**: Set `list.showContextMenu: true` to display in list context menu.

## Client-Side Scripting

1. **client object**: Use the `client` object for client-side script configuration: `{ isClient, isUi11Compatible, isUi16Compatible, onClick }`.
1. **isClient**: Set `client.isClient: true` when using client-side scripts.
1. **onClick**: Use `client.onClick` to specify the function name to execute (e.g., `'onClickFunction(g_form)'`).
1. **script property**: The `script` property (at root level) contains the actual function definition that will be called by onClick.
1. **Return values**: Client scripts should return `true` to proceed with default action, or `false` to prevent it.

## Workspace Compatibility

1. **workspace object**: Use the `workspace` object for workspace configuration: `{ isConfigurableWorkspace, showFormButtonV2, showFormMenuButtonV2, clientScriptV2 }`.
1. **isConfigurableWorkspace**: Set `workspace.isConfigurableWorkspace: true` to enable workspace compatibility.
1. **showFormButtonV2**: Set `workspace.showFormButtonV2: true` for workspace form buttons.
1. **showFormMenuButtonV2**: Set `workspace.showFormMenuButtonV2: true` for workspace form menu items.
1. **clientScriptV2**: Use `workspace.clientScriptV2` to define workspace-specific client scripts (alternative to root-level `script`).

## UI Compatibility

1. **isUi16Compatible**: Set `client.isUi16Compatible: true` for UI16/Next Experience compatibility (List V3).
1. **isUi11Compatible**: Set `client.isUi11Compatible: true` for UI11 compatibility (List V2).

## Display Conditions

1. **showInsert/showUpdate**: Use `showInsert: true` for new records, `showUpdate: true` for existing records, or both to show on all forms.
1. **condition field**: Use server-side condition scripts to control visibility (e.g., `'gs.hasRole("admin")'`, `'current.state != 6'`). Conditions are evaluated server-side.
1. **Complex conditions**: Combine multiple conditions with `&&` and `||` operators (e.g., `'current.priority <= 2 && current.state != 6 && gs.hasRole("itil")'`).

## Additional Properties

1. **order field**: Use `order` property to control display sequence - lower numbers appear first (default is 100).
1. **comments**: Always add descriptive `comments` for documentation purposes.
1. **hint**: Use `hint` for tooltip text shown on hover.
1. **messages**: Use `messages` array for user-facing messages or notifications (e.g., `messages: ['Success message']`).
1. **roles**: Use `roles` array to restrict access to specific roles (e.g., `roles: ['admin', 'itil']`).

## Best Practices

1. **Server-side vs client-side**: If no user interaction is needed, omit the `client` object entirely - the UI Action will perform server-side action only.
1. **Error handling**: Always validate data in client scripts before processing (check for null/empty values).
1. **User feedback**: Use `g_form.addInfoMessage()`, `g_form.addErrorMessage()`, or `g_form.addWarningMessage()` to provide clear feedback.
1. **List actions**: For list actions using `g_list.getChecked()`, always verify that records are selected before processing.
1. **Confirmation dialogs**: Use `confirm()` for destructive actions to prevent accidental execution.
1. **isolateScript**: Set `isolateScript: true` for enhanced security when running scripts in strict mode, though this limits access to DOM and global objects.

## Common Pitfalls

1. **Nested structure**: Don't use flat properties like `formButton: true` - use `form: { showButton: true }` instead.
1. **script vs clientScriptV2**: Use `script` at root level for standard forms, or `workspace.clientScriptV2` for workspace-specific scripts.
1. **Active state**: Ensure `active: true` is set, otherwise the UI Action won't be visible to users.
1. **Role-based conditions**: Always test conditions with appropriate user roles to ensure visibility works as expected.
1. **GlideAjax calls**: When using GlideAjax in client scripts, ensure the corresponding Script Include is client-callable.
1. **messages array**: Remember `messages` is an array of strings, not a single string.
