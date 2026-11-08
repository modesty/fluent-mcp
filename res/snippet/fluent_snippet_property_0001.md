# Property API example: creating a new string Property in ServiceNow with access roles specified
```typescript
// App scope: x_snc_example
import { Role, Property } from "@servicenow/sdk/core";

// Declare the roles before the property that references them
const itilRole = Role({
   name: 'x_snc_example.itil'
})

const incidentManagerRole = Role({
   name: 'x_snc_example.incident_manager',
})

export const stringProp = Property({
   $id: Now.ID['1234'],
   name: 'x_snc_example.example.string.property',
   type: 'string',
   value: 'example string property',
   description: 'A new example string property',
   roles: {
      read: [itilRole],
      write: ['admin', incidentManagerRole],
   },
   ignoreCache: false,
   isPrivate: false,
})
```