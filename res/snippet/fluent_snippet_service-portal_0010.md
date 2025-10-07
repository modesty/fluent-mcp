# Create a Service Portal Angular Provider as a service

```typescript
import { SpAngularProvider } from '@servicenow/sdk/core'

SpAngularProvider({
    $id: Now.ID['data_service'],
    name: 'DataService',
    type: 'service',
    script: `function($http) {
    var service = this;
    
    service.getData = function() {
        return $http.get('/api/now/table/incident?sysparm_limit=10')
            .then(function(response) {
                return response.data.result;
            });
    };
    
    service.processData = function(data) {
        return data.map(function(item) {
            return {
                id: item.sys_id,
                number: item.number,
                description: item.short_description
            };
        });
    };
}`,
})
```
