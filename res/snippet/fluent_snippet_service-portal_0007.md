# Create a Service Portal widget dependency for custom JavaScript utilities

```typescript
import { SPWidgetDependency } from '@servicenow/sdk/core'

SPWidgetDependency({
    $id: Now.ID['custom_utilities'],
    name: 'Custom Utilities',
    jsIncludes: `// Custom utility functions
(function() {
    window.customUtils = {
        formatDate: function(date) {
            return new Date(date).toLocaleDateString();
        },
        formatCurrency: function(amount) {
            return '$' + parseFloat(amount).toFixed(2);
        }
    };
})();`,
    order: 100,
})
```
