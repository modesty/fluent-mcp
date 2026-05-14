// Creates a new Role (`sys_user_role`)
Role({
    name: '', // string, mandatory
    description: '', // string, mandatory
    assignableBy: '', // string, mandatory
    canDelegate: true, // boolean, mandatory
    elevatedPrivilege: false, // boolean, mandatory
    grantable: true, // boolean, mandatory
    containsRoles: [get_sys_id('sys_user_role', '')], // array of Record<'sys_user_role'>, optional, either sys_id or Role object
    scopedAdmin: false, // boolean, mandatory
}); // returns a Role object