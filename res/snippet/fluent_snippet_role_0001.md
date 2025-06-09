# create a named Role with or without contained roles
```typescript
import { Role } from "@servicenow/sdk/core";

const managerRole = Role({ 
   $id: Now.ID['manager_role'], // unique identifier
   name: 'sn_xxxx.manager' // role name
})

const supervisorRole = Role({ 
   $id: Now.ID['supervisor_role'], // unique identifier
   name: 'sn_xxxx.supervisor', // role name
   contains_roles: [managerRole, get_sys_id('sys_user_role', 'name=itil')] // array of Record<'sys_user_role'>, this establishes a hierarchy where the sn_xxxx.supervisor role encompasses the sn_xxxx.manager and itil roles.
})
```
