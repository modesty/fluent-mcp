# create a script include with a function to check roles, accessible from this application scope only
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID["role_checker_si"],
    table: "sys_script_include",
    data: {
        name: "RoleChecker",
        description: "Utility to check for role.",
        script: get_glide_script(
                'sys_script_include', 
                'Write a function for RoleChecker script include to check if user has specified roles.', 
                ''),
        access: "package_private", // accessible from this application scope only
        active: true,
        client_callable: false,
        mobile_callable: false,
        sandbox_callable: false,
    }
})
```
