# create a named Role with or without contained roles
```typescript
import { Role } from "@servicenow/sdk/core";

const managerRole = Role({ 
   name: 'x_example.manager' // role name
})

const supervisorRole = Role({ 
   name: 'x_example.supervisor', // role name
   contains_roles: [managerRole, get_sys_id('sys_user_role', 'name=itil')] // array of Record<'sys_user_role'>, this establishes a hierarchy where the sn_xxxx.supervisor role encompasses the sn_xxxx.manager and itil roles.
})
```
