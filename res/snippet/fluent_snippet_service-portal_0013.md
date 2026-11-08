# Create a Service Portal Angular Provider for a reusable formatter (in place of an Angular filter)

An `sp_angular_provider` is a `directive`, `factory` or `service` only; there is no `filter` type. Wrap the
formatting function in a factory, inject it into the widget's client controller, and call it from the template
(for example `{{c.timeAgo(item.sys_created_on)}}` after `c.timeAgo = timeAgo;`).

```typescript
import { SPAngularProvider } from '@servicenow/sdk/core'

SPAngularProvider({
    $id: Now.ID['time_ago_filter'],
    name: 'timeAgo',
    type: 'factory',
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
