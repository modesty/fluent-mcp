# Create a Service Portal Angular Provider with role restrictions

```typescript
import { SpAngularProvider } from '@servicenow/sdk/core'

SpAngularProvider({
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
    restricted: true,
    roles: 'admin',
})
```
