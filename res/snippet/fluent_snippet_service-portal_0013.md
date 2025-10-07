# Create a Service Portal Angular Provider as a filter

```typescript
import { SpAngularProvider } from '@servicenow/sdk/core'

SpAngularProvider({
    $id: Now.ID['time_ago_filter'],
    name: 'timeAgo',
    type: 'filter',
    script: `function() {
    return function(dateString) {
        if (!dateString) return '';
        
        var date = new Date(dateString);
        var now = new Date();
        var seconds = Math.floor((now - date) / 1000);
        
        var interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
        
        return 'just now';
    };
}`,
})
```
