# Create a Service Portal widget with role-based access control

```typescript
import { SpWidget } from '@servicenow/sdk/core'

SpWidget({
    $id: Now.ID['admin_widget'],
    name: 'Admin Only Widget',
    description: 'Widget restricted to admin role',
    htmlTemplate: `<div>
  <h3>Administrator Dashboard</h3>
  <p>{{c.data.adminMessage}}</p>
</div>`,
    serverScript: `(function() {
  // Server-side role check
  if (gs.hasRole('admin')) {
    data.adminMessage = "Welcome, Administrator!";
  } else {
    data.adminMessage = "Access Denied";
  }
})();`,
    roles: 'admin',
})
```
