# create a script include with a function to check roles, accessible from this application scope only
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID["role_checker_si"],
    table: "sys_script_include",
    data: {
        name: "RoleChecker",
        description: "Utility to check for role.",
        script: `var RoleChecker = Class.create();
RoleChecker.prototype = {
    initialize: function() {
        this.currentUser = gs.getUser();
    },
    
    /**
     * Check if the current user has all specified roles
     * @param {Array|String} roles - Single role or array of roles to check
     * @return {Boolean} True if user has all specified roles, false otherwise
     */
    hasRoles: function(roles) {
        var rolesArray = Array.isArray(roles) ? roles : [roles];
        
        for (var i = 0; i < rolesArray.length; i++) {
            if (!this.currentUser.hasRole(rolesArray[i])) {
                return false;
            }
        }
        return true;
    },
    
    /**
     * Check if the current user has any of the specified roles
     * @param {Array|String} roles - Single role or array of roles to check
     * @return {Boolean} True if user has any of the specified roles, false otherwise
     */
    hasAnyRole: function(roles) {
        var rolesArray = Array.isArray(roles) ? roles : [roles];
        
        for (var i = 0; i < rolesArray.length; i++) {
            if (this.currentUser.hasRole(rolesArray[i])) {
                return true;
            }
        }
        return false;
    },
    
    type: 'RoleChecker'
};`,
        access: "package_private", // accessible from this application scope only
        active: true,
        client_callable: false,
        mobile_callable: false,
        sandbox_callable: false,
    }
})
```
