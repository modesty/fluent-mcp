# Instructions for Fluent UI Action Spec API
1. Always reference the UI Action API specifications for more details.
2. Every `action_name` should always be prefixed with 'sysverb_'.
3. Set field `client` to true only when `onlick` field is specified with a function name. Else, its always default to false.
4. The function name in field `onlick` should always match the function name as defined in `client_script_v2`, which is the inline Servicenow client side scripting.
5. If protection policy is specified to be set, then map to field `sys_policy`. Else, completely skip the field from code generation.
6. Workspace form button corresponds to field name `form_button_v2`, hence, when specified, set value in `form_button_v2` field.
7. Workspace form menu corresponds to field name `form_menu_button_v2`, hence, when specified, set value in `form_menu_button_v2` field.
8. Set `format_for_configurable_workspace` to true only if workspace form button and workspace form menu is enabled, else, it's false.
9. List V2 compatible corresponds to `ui11_compatible` and List V3 compatible corresponds to `ui16_compatible`, hence, when specified, set value in appropriate field.