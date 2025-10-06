#**Context:** Role API spec: define Roles [sys_user_role] for users of an application. Roles are closely working with ACLs to control user's access to applications and their features.
```typescript
// Creates a new Role (`sys_user_role`)
Role({ 
    name: '', // string, mandatory
    description: '', // string, mandatory
    assignable_by: '', // string, mandatory
    can_delegate: true, // boolean, mandatory
    elevated_privilege: false, // boolean, mandatory
    grantable: true, // boolean, mandatory
    contains_roles: [get_sys_id('sys_user_role', '')], // array of Record<'sys_user_role'>, optional, either sys_id or Role object
    scoped_admin: false, // boolean, mandatory
}): Role; // returns a Role object
```
