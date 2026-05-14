
# Implementing Security Guide

Implement ServiceNow application security using ACLs (`sys_security_acl`), Roles (`sys_user_role`), Security Attributes (`sys_security_attribute`), and Security Data Filters (`sys_security_data_filter`). This guide covers the layered security model -- from defining roles, to creating ACL rules, to row-level filtering with data filters and reusable security predicates.

## When to Use

- Securing tables, fields, or resources with access control rules
- Creating roles for an application
- Implementing row-level data filtering based on user attributes
- Defining reusable security predicates (Security Attributes)
- Proactively when creating tables with sensitive data or applications needing role-based access control

## Overall Security Model

1. **Start with Roles:** Define roles first -- they are required by ACLs and referenced by Security Attributes.
2. **Then ACLs:** Create ACL rules to secure tables, fields, and resources. Each ACL secures one operation on one object.
3. **Use Security Attributes for reusable predicates:** When the same role/condition logic appears in multiple ACLs, extract it into a Security Attribute.
4. **Add Data Filters for row-level security:** When users should see only certain rows (not the whole table), add Security Data Filters paired with Deny ACLs.

## Security Layer Hierarchy

| Layer | API | Purpose |
|-------|-----|---------|
| Roles | `Role()` | Define personas with permissions |
| ACLs | `Acl()` | Control access to objects/operations |
| Security Attributes | `Record` on `sys_security_attribute` | Reusable security predicates |
| Data Filters | `Record` on `sys_security_data_filter` | Row-level filtering |

## ACL Evaluation Order

1. Deny-Unless ACLs evaluate first -- if any fail, access is denied
2. Allow-If ACLs evaluate second -- at least one must pass to grant access
3. Within each ACL: roles, condition, and script ALL must pass (the "Trinity")

## Roles

### Instructions

1. Always prefix role names with the application scope -- e.g., `x_my_scope.manager`.
2. Use `containsRoles` for inheritance -- a supervisor role can contain a manager role.
3. For existing platform roles (e.g., `itil`), look up the `sys_id` from `sys_user_role`.
4. You cannot rename roles after they are saved.

### Role API Reference

For the full property reference, see the `role-api` topic.

### Role Example

```javascript
import { Role } from "@servicenow/sdk/core";

const managerRole = Role({
  $id: Now.ID["manager_role"],
  name: "x_snc_example.manager"
});

const adminRole = Role({
  $id: Now.ID["admin_role"],
  name: "x_snc_example.admin",
  containsRoles: [managerRole]
});

const supervisorRole = Role({
  $id: Now.ID["supervisor_role"],
  name: "x_snc_example.supervisor",
  containsRoles: [managerRole, "282bf1fac6112285017366cb5f867469"]
  // Fluent object and sys_id of itil role
});
```

## ACLs

### Instructions

1. ACLs require at least one of: roles, security attribute, condition, or script.
2. **The Trinity:** All specified conditions (roles AND condition AND script) must evaluate to true to grant access.
3. For table-level access: Use `type: 'record'` and omit `field`. For field-level, set `field` to the column name or `"*"` for all fields.
4. One ACL per operation: Create separate ACLs for read, write, delete, etc.
5. Use `roles` for role checks, not scripts -- only use scripts for complex business logic (e.g., ownership checks).

### ACL API Reference

For the full property reference, see the `acl-api` topic.

### ACL Examples

**Table-level ACL with roles:**

```javascript
import { Acl, Role } from "@servicenow/sdk/core";

const travelAgentRole = Role({
  $id: Now.ID["travel_agent_role"],
  name: "sn_travel_app.travel_agent"
});

export default Acl({
  $id: Now.ID["booking_read_acl"],
  type: "record",
  table: "sn_travel_app_booking",
  operation: "read",
  roles: [travelAgentRole],
  adminOverrides: true
});
```

**Field-level ACL:**

```javascript
export default Acl({
  $id: Now.ID["booking_status_write_acl"],
  type: "record",
  table: "sn_travel_app_booking",
  field: "status",
  operation: "write",
  roles: [travelAgentRole, travelManagerRole],
});
```

**Script-based ACL (ownership check):**

```javascript
export default Acl({
  $id: Now.ID["booking_delete_owner_acl"],
  type: "record",
  table: "sn_travel_app_booking",
  operation: "delete",
  roles: [travelerRole],
  script: `
    var isOwner = (current.sys_created_by == gs.getUserName());
    var isPending = (current.status == 'pending');
    answer = isOwner && isPending;
  `,
});
```

### Deny-Unless ACLs

Deny-Unless ACLs (`decisionType: 'deny'`) evaluate before Allow ACLs and deny access unless conditions are met. They do not grant access on their own -- at least one Allow ACL must also match.

```javascript
// Deny access unless user has itil role
export const incidentDenyUnlessItil = Acl({
  $id: Now.ID["incident_deny_unless_itil"],
  type: "record",
  table: "incident",
  operation: "read",
  decisionType: "deny",
  roles: [itilRole],
});

// Corresponding Allow ACL
export const incidentAllowRead = Acl({
  $id: Now.ID["incident_allow_read"],
  type: "record",
  table: "incident",
  operation: "read",
  decisionType: "allow",
  roles: [itilRole],
});
```

### Query ACLs

Query ACLs protect against blind query attacks:
- `query_match` -- Controls safe operators (EQUALS, IN, NOT_EQUALS, etc.)
- `query_range` -- Controls dangerous operators (CONTAINS, >=, <=, STARTS_WITH, etc.)

Use when columns contain sensitive values and partial/conditional access exists.

```javascript
export const payrollSalaryQueryRange = Acl({
  $id: Now.ID["payroll_salary_query_range"],
  type: "record",
  table: "payroll",
  field: "salary",
  operation: "query_range",
  decisionType: "deny",
  roles: [hrAdminRole],
});
```

## Security Attributes

Use the Record API on `sys_security_attribute`. Prefer `compound` type -- it is the only type that can be referenced in ACLs and Data Filters.

### Security Attribute Types

| Type | Use for | Can use in ACLs? |
|------|---------|-----------------|
| `compound` | Role/group conditions via encoded query | Yes |
| `true\|false` | Complex boolean logic via script | No |
| `string` / `integer` / `list` | Value calculations | No |

### Key Rules

- Use `condition` field for compound types with encoded query syntax (e.g., `"Role=manager^ORRole=admin"`)
- Never use `current` in security attribute scripts -- no record context available
- Set `is_dynamic: false` for role/group checks that can be cached per session

### Examples

```typescript
import "@servicenow/sdk/global";
import { Record } from "@servicenow/sdk/core";

// Compound type (recommended)
export const hasManagerRole = Record({
  $id: Now.ID["has-manager-role"],
  table: "sys_security_attribute",
  data: {
    name: "HasManagerRole",
    type: "compound",
    label: "Has Manager Role",
    description: "Checks if the current user has the manager role",
    condition: "Role=manager",
    is_dynamic: false
  }
});

// Boolean script type
export const hasFinanceRole = Record({
  $id: Now.ID["has-finance-role"],
  table: "sys_security_attribute",
  data: {
    name: "HasFinanceRole",
    type: "true|false",
    label: "Has Finance Role",
    script: 'answer = gs.hasRole("finance") || gs.getUser().isMemberOf("finance_users");',
    is_dynamic: false
  }
});
```

## Security Data Filters

Use the Record API on `sys_security_data_filter`. Always pair with Deny ACLs -- Data Filters alone do not provide complete security.

### Properties

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | `string` | Yes | Descriptive name. |
| `table_name` | `string` | Yes | Target table. |
| `mode` | `string` | Yes | `"if"` (filter when condition met) or `"unless"` (filter unless condition met). |
| `security_attribute` | `reference` | Yes | Reference to `sys_security_attribute` (must be compound type). |
| `filter` | `string` | No | Encoded query condition. |
| `active` | `boolean` | No | Default: `true`. |

### Key Rules

- `security_attribute` is required -- always reference a compound Security Attribute
- Use dynamic conditions (e.g., `fieldnameDYNAMIC90d1921e5f510100a9ad2572f2b477fe` for current user) instead of hardcoded values
- Use indexed columns in filters for performance

### Example

```typescript
export const filterFinancialRecords = Record({
  $id: Now.ID["filter-financial-records"],
  table: "sys_security_data_filter",
  data: {
    description: "Restrict high-value transactions to authorized personnel",
    table_name: "finance_transaction",
    mode: "unless",
    security_attribute: hasFinanceRoleAttribute,
    filter: "amount>10000^ORclassification=confidential",
  }
});
```

## Avoidance

- Never create roles without scope prefix -- use `x_scope.role_name` format
- Never use scripts in ACLs for simple role checks -- use the `roles` property
- Never rely on Data Filters alone -- always pair with Deny ACLs
- Never use `current` in Security Attribute scripts -- no record context available
- Never hardcode user IDs or names in ACL scripts or Data Filter conditions
- Never use non-compound Security Attributes in ACLs -- only compound type is supported

