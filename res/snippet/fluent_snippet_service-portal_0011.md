# Create a Service Portal Angular Provider as a factory

```typescript
import { SpAngularProvider } from '@servicenow/sdk/core'

SpAngularProvider({
    $id: Now.ID['utility_factory'],
    name: 'UtilityFactory',
    type: 'factory',
    script: `function() {
    return {
        formatDate: function(dateString) {
            if (!dateString) return '';
            var date = new Date(dateString);
            return date.toLocaleDateString();
        },
        
        truncate: function(text, length) {
            if (!text) return '';
            if (text.length <= length) return text;
            return text.substring(0, length) + '...';
        },
        
        getStatusClass: function(status) {
            var statusMap = {
                'new': 'label-primary',
                'in_progress': 'label-warning',
                'closed': 'label-success'
            };
            return statusMap[status] || 'label-default';
        }
    };
}`,
})
```
