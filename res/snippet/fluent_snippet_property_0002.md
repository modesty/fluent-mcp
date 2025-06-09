# Property API example: creating a new integer Property in ServiceNow with access roles specified
```typescript
import { Role, Property } from "@servicenow/sdk/core";

export const intProp = Property({
   $id: Now.ID['1234'],
   name: 'x_snc_app.example.integer.property',
   type: 'integer',
   value: '1000',
   description: 'A new integer property',
   roles: {
      read: ['itil'],
      write: ['admin', 'incident_manager'],
   },
   ignoreCache: false,
   isPrivate: false,
})
```