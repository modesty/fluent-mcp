#**Context:** Acl API spec: Acl (Access Control List) is used to manage user's access to applications and their features.
```typescript
// spec to create ACL in Fluent
const specAcl = Acl({
    $id: '', // string | guid, mandatory
    active: true, // boolean, mandatory
    name: '', // string, mandatory
    type: 'record', // mandatory, typed string: `record`, `rest_endpoint`, `ui_page`, `processor`, `graphql`, `pd_action`, `ux_data_broker`, `ux_page`, `ux_route`, `client_callable_flow_object`, `client_callable_script_include`
    operation: 'read', // mandatory, typed string: `execute`, `create`, `read`, `write`, `delete`, `edit_task_relations`, `edit_ci_relations`, `save_as_template`, `add_to_list`, `report_on`, `list_edit`, `report_view`, `personalize_choices`
    table: get_table_name(''), // mandatory if `type` is `record`
    field: '*', // mandatory if `type` is `record`: `*` or comma delimited list of field names
    applies_to:get_encoded_query(
        '', // string, requested change from devrequest
        '' // string, table name
	),	// only applicable if `type` is `record`
    roles: [get_sys_id('sys_user_role', '')], // array of Record<'sys_user_role'>, either sys_id for existing roles or Role object for new roles
    decision_type: 'allow', // typed string, `allow`|`deny`
    condition: get_encoded_query(
        '', // string, requested change from devrequest
         '' // string, table name
	),
    script: '', // ServiceNow script to fullfil the functional request in scripting,
    admin_overrides: true, // boolean, default is true
    security_attribute: 'user_is_authenticated', // typed string, `user_is_authenticated`|`has_admin_role`,
    local_or_existing: 'Local', // typed string, 'Local'|'Exisiting': if `Local`: A security attribute based on the `condition` property that is saved only for the ACL it is created in; if `Exisiting`: An existing security attribute to reference in the `security_attribute` property
}): Acl; // returns an Acl object
```
