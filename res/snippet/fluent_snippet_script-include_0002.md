# create a script include to store constants for the app, accessible from all application scopes with caller tracking
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID["test_app_constants_si"],
    table: "sys_script_include",
    data: {
        name: "TestAppConstants",
        description: "Constants for TestApp",
        script: get_glide_script(
                'sys_script_include', 
                'Write a TestAppConstants script include that defines table and schema constants for TestApp', 
                ''),
        access: "public", // accessible from all application scopes
        caller_access: '1', // keep track of the caller through cross-scope privileges
        active: true,
        client_callable: false,
        mobile_callable: false,
        sandbox_callable: false,
    }
})
```
