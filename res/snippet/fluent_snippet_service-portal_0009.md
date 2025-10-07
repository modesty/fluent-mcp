# Create a Service Portal widget dependency with Angular module

```typescript
import { SPWidgetDependency } from '@servicenow/sdk/core'

SPWidgetDependency({
    $id: Now.ID['custom_angular_module'],
    name: 'Custom Angular Module',
    angularModuleName: 'customModule',
    jsIncludes: `// Define custom Angular module
angular.module('customModule', [])
    .service('customService', function() {
        this.getMessage = function() {
            return 'Hello from custom service';
        };
    });`,
    order: 200,
})
```
