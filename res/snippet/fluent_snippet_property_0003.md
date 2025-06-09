# Property API example: creating a new boolean Property in ServiceNow with access roles specified
```typescript
import { Role, Property } from "@servicenow/sdk/core";

Property({
   $id: Now.ID['1234'],
   name: 'x_snc_app.example.boolean.property',
   type: 'boolean',
   value: 'true',
   description: 'A new boolean property',
   roles: {
      read: ['itil'],
      write: ['admin'],
   },
   ignoreCache: false,
   isPrivate: false,
})
```