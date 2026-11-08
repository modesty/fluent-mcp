# Create a Service Portal Angular Provider used by a role-restricted widget

An `sp_angular_provider` has no `roles` or `restricted` property: its script is client-side code that any portal
page can load. Restrict access where it can be enforced instead: on the widget that uses the provider (`roles`),
and on the server (the REST endpoints the service calls must check roles themselves).

```typescript
import { SPAngularProvider, SPWidget } from '@servicenow/sdk/core'

const adminService = SPAngularProvider({
    $id: Now.ID['admin_service'],
    name: 'AdminService',
    type: 'service',
    script: `function($http) {
    var service = this;
    
    service.performAdminAction = function(action) {
        return $http.post('/api/x_custom/admin/action', {
            action: action
        }).then(function(response) {
            return response.data;
        });
    };
    
    service.getSystemStats = function() {
        return $http.get('/api/x_custom/admin/stats')
            .then(function(response) {
                return response.data.result;
            });
    };
}`,
})

export const adminConsoleWidget = SPWidget({
    $id: Now.ID['admin_console_widget'],
    name: 'Admin Console',
    description: 'Admin-only widget that uses AdminService',
    roles: ['admin'], // only users with the admin role can see this widget
    angularProviders: [adminService],
    htmlTemplate: `<div>
  <h3>System Stats</h3>
  <pre>{{c.stats | json}}</pre>
</div>`,
    clientScript: `function(AdminService) {
  var c = this;
  AdminService.getSystemStats().then(function(stats) {
    c.stats = stats;
  });
}`,
})
```
