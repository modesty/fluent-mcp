# create a named Role with or without contained roles
```typescript
// App scope: x_example
import { Role } from "@servicenow/sdk/core";

export const managerRole = Role({
   name: 'x_example.manager' // role name
})

export const supervisorRole = Role({
   name: 'x_example.supervisor', // role name
   containsRoles: [managerRole, 'itil'] // (string | Role)[]: a Role object and an existing role by name, this establishes a hierarchy where the x_example.supervisor role encompasses the x_example.manager and itil roles.
})
```
