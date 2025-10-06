# Instructions for Fluent Acl (Access Control List) API
Always reference the Acl API specifications for more details.
1. when `type` is `record`, provide the `table` and `field` properties, `appliesTo` is only applicable to `record` type ACL too but optional and `name` is not applicable.
2. `roles` property is an array of Record<'sys_user_role'>, either sys_ids or Role objects. If using a new role, use the Role object. If using an existing role, use function like `get_sys_id('sys_user_role', 'name=ex_role')` - no `label` field for roles.
3. The `script` property is optional and should only be used for advanced ACLs where the condition cannot be expressed using just the `roles` and `condition` fields.
4. a `named ACL` can be created by providing a value for the `$id` , `type` and `name` properties.
5. For ACL updates, do not modify the `script` property unless explicitly specified.