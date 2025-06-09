# Property API example: creating a new string Property in ServiceNow with access roles specified
```typescript
import { Role, Property } from "@servicenow/sdk/core";

const stringProp = Property({
   $id: Now.ID['1234'],
   name: 'x_snc_app.example.string.property',
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

const itilRole = Role({ 
   $id: Now.ID['itil_role'],
   name: 'x_snc_example.itil'
})

const incidentManagerRole = Role({ 
   $id: Now.ID['incident_manager_role'],
   name: 'x_snc_example.incident_manager',
})
```