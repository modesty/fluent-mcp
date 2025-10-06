# Instructions on Fluent Role API
Always reference the Role API specification for more details.
1. `$id` is deprecated since v4.0.0.
2. `containsRoles` property is an array of Record<'sys_user_role'>, either sys_ids or Role objects. It is optional, it indicates other Role objects that this role contains. If using a new role, use the Role object. If using an existing role, use function like `get_sys_id('sys_user_role', 'name=ex_role')` - no `label` field for roles.
3. `elevatedPrivilege` is default to `false`, when it's `true`, it means user must manually accept the responsibility of using the role before you can access its features.
4. `canDelegate` is default to `true`, when it's `false`, it means the role cannot be delegated to other users.
