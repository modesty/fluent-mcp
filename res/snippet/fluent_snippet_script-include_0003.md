# Script Include API example: editing a script include to update the script add a function to log caller name
```typescript
import { Record } from '@servicenow/sdk/core'

Record({
    $id: '4e7880f23714221002e674e8f2924b29',
    table: "sys_script_include",
    data: {
        name: "TestAppConstants",
        description: "Constants for TestApp",
        script: get_glide_script(
                'sys_script_include', 
                'Update the script add a function to log caller name', 
                'var TestAppConstants = Class.create(); TestAppConstants.prototype = {initialize: function() {}, type:TestAppConstants};'),
        access: "public", // accessible from all application scopes
        caller_access: '1', // keep track of the caller through cross-scope privileges
        active: true,
        client_callable: false,
        mobile_callable: false,
        sandbox_callable: false,
    }
})
```
