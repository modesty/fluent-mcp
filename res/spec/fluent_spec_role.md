#**Context:** Role API spec: define Roles [sys_user_role] for users of an application. Roles are closely working with ACLs to control user's access to applications and their features.
```typescript
// Creates a new Role (`sys_user_role`)
Role({
    name: '', // string, mandatory
    description: '', // string, mandatory
    assignableBy: '', // string, mandatory
    canDelegate: true, // boolean, mandatory
    elevatedPrivilege: false, // boolean, mandatory
    federatedId: '', // string, optional (SDK v4.9.0+) - identifier used to match this role to an externally federated role during identity federation
    grantable: true, // boolean, mandatory
    containsRoles: ['itil'], // (string | Role)[], optional - Role objects, an existing role's name (a non-GUID string is resolved by role name at build time), or its sys_id
    scopedAdmin: false, // boolean, mandatory
    suffix: '', // string, optional (SDK v4.14.0+) - short identifier written to sys_user_role.suffix. Defaults to `name` minus the
        // '<scope>.' prefix (e.g. 'manager' for 'x_acme.manager'); set it only to keep a different value (an explicit non-empty value wins)
}): Role; // returns a Role object
```
