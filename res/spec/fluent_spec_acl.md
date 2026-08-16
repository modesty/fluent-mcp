# **Context:** Acl API spec: Acl (Access Control List) is used to manage user's access to applications and their features

```typescript
// spec to create ACL in Fluent
const specAcl = Acl({
    $id: '', // string | guid, mandatory
    active: true, // boolean, optional
    name: '', // string — mandatory for the named object types (`rest_endpoint`, `ui_page`, `processor`, `graphql`, `client_callable_flow_object`, `client_callable_script_include`); optional for `ux_page`/`ux_route`; not applicable when `type` is `record` or `pd_action` (use `table`/`field` instead)
    type: 'record', // mandatory — the object type being secured, see "ACL object types" below: `record`, `rest_endpoint`, `ui_page`, `processor`, `graphql`, `pd_action`, `ux_data_broker`, `ux_page`, `ux_route`, `client_callable_flow_object`, `client_callable_script_include`. Type is `keyof typeof AclTypes | (string & {})`, so those 11 are autocomplete suggestions, NOT a compile-time constraint — any string compiles. `type` also selects which variant properties apply (`table`/`field` vs `name` vs `dataBroker`) and CANNOT be changed after the ACL is created.
    operation: 'read', // mandatory — the operation this rule secures: `execute`, `create`, `read`, `write`, `delete`, `conditional_table_query_range`, `data_fabric`, `query_match`, `query_range`, `edit_task_relations`, `edit_ci_relations`, `save_as_template`, `add_to_list`, `report_on`, `list_edit`, `report_view`, `personalize_choices`. Type is `keyof typeof AclOperations | (string & {})` — those 17 are autocomplete suggestions, NOT a compile-time constraint. One ACL secures exactly one operation.
    table: '', // mandatory if `type` is `record` or `pd_action`; optional for `ux_data_broker`, `ux_page` and `ux_route`
    field: '*', // for field-level `record` ACLs: a schema field name, a system column, or the wildcard `*` (type: keyof FullSchema<T> | SystemColumns | '*', SDK 4.8.0+ accepts custom column names)
    appliesTo: '', // ServiceNow encoded query, applicable when `type` is `record` or `pd_action` (also accepted for `ux_page`/`ux_route`); not available for the named types or `ux_data_broker`
    roles: [get_sys_id('sys_user_role', '')], // array of Record<'sys_user_role'>, either sys_id for existing roles or Role object for new roles
    decisionType: 'allow', // typed string, `allow`|`deny`
    condition: '', // ServiceNow encoded query
    script: '', // ServiceNow script to fullfil the functional request in scripting,
    adminOverrides: true, // boolean, default is true
    securityAttribute: 'LoggedIn', // typed string, `LoggedIn`|`Group`|`GroupExplicit`|`HasAdminRole`|`Impersonating`|`InteractiveSession`|`NetworkCriteria`|`Role`|`RoleExplicit`, additional security attributes may be available based on installed plugins, ex. com.glide.client_session_security_attributes
    localOrExisting: 'Local', // typed string, 'Local'|'Existing': if `Local`: A security attribute based on the `condition` property that is saved only for the ACL it is created in; if `Existing`: An existing security attribute to reference in the `security_attribute` property
    protectionPolicy: 'read', // typed string (added SDK 4.4.0): 'read' | 'protected' — controls edit/view access for other developers
    dataBroker: '', // string | Record<'sys_ux_data_broker'>, optional — reference to UX data broker, applicable when `type` is `ux_data_broker`
    $meta: { installMethod: 'once' }, // optional (SDK 4.8.0+): { installMethod: 'first install' | 'demo' | 'once' } — load the record only in specific circumstances
}): Acl; // returns an Acl object
```

## ACL object types

`type` selects what the rule secures and which variant properties apply.

| `type` | Secures | Variant properties |
|--------|---------|--------------------|
| `record` | Table rows and fields (the default and most common) | `table` (required), `field`, `appliesTo` |
| `pd_action` | Predictive Decision actions | `table` (required), `field`, `appliesTo` |
| `rest_endpoint` | REST API endpoints | `name` (required) |
| `ui_page` | UI Pages | `name` (required) |
| `processor` | Processors | `name` (required) |
| `graphql` | GraphQL endpoints | `name` (required) |
| `client_callable_flow_object` | Client-callable flows | `name` (required) |
| `client_callable_script_include` | Client-callable script includes | `name` (required) |
| `ux_data_broker` | UX data broker scripts | `dataBroker`, `table`, `field` (all optional) |
| `ux_page` | UX pages | `name`, `table`, `field`, `appliesTo` (all optional) |
| `ux_route` | UX routes — use this for workspace ACLs | `name`, `table`, `field`, `appliesTo` (all optional) |

**WARNING — the object type is immutable.** After creating an ACL rule you cannot change its object type; delete the ACL and create a new one with the correct type.

Note: these 11 values are what the SDK documents and autocompletes, but the declared type is `keyof typeof AclTypes | (string & {})`, so TypeScript will not reject an unknown `type` string.

## Query ACLs (`operation: 'query_match'` / `'query_range'`)

Query ACLs guard against blind-query attacks by controlling which query operators a user may apply to a column. Use them when a column holds sensitive values and some users have only partial or conditional access. By default both operations resolve to a `*.*` ACL that delegates to read access: where no query ACL exists the read rules apply, and where one is defined it overrides that default.

- `query_match` — the "safe" operators that fetch specific records: `EQUALS`, `NOT_EQUALS`, `IN`, `NOT_IN`, `SAMEAS`, `NSAMEAS`, `ANYTHING`, `ISEMPTYSTRING`, `ISEMPTY`, `ISNOTEMPTY`, `ISNULL`, `ISNOTNULL`.
- `query_range` — range/pattern operators that can be exploited to extract data: `STARTS_WITH`, `CONTAINS`, `>=`, `<=`, `BETWEEN` and similar range operators (the SDK guide's list is open-ended, not a closed set). Sorting by the column is also restricted when this ACL fails.

These operator names are runtime platform semantics, not Fluent values: they describe which operators each ACL operation governs. Nothing in the `Acl` type accepts an operator name — you only set `operation: 'query_match'` or `operation: 'query_range'` (plus `table`, `field`, `roles`/`condition`/`script`).
