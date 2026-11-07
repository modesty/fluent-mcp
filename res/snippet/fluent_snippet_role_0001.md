# create a named Role with or without contained roles
```typescript
import { Role } from "@servicenow/sdk/core";

const managerRole = Role({ 
   name: 'x_example.manager' // role name
})

const supervisorRole = Role({
   name: 'x_example.supervisor', // role name
   containsRoles: [managerRole, 'itil'] // (string | Role)[]: a Role object and an existing role by name, this establishes a hierarchy where the sn_xxxx.supervisor role encompasses the sn_xxxx.manager and itil roles.
})
```
