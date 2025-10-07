# Create a Service Portal widget with client script for interactivity

```typescript
import { SpWidget } from '@servicenow/sdk/core'

SpWidget({
    $id: Now.ID['interactive_widget'],
    name: 'Interactive Widget',
    description: 'Widget with client-side interaction',
    htmlTemplate: `<div>
  <h3>{{c.data.title}}</h3>
  <button ng-click="c.refresh()" class="btn btn-primary">Refresh</button>
  <p>{{c.data.message}}</p>
</div>`,
    clientScript: `function() {
  var c = this;
  
  c.refresh = function() {
    c.server.refresh();
  };
}`,
    serverScript: `(function() {
  data.title = "Interactive Example";
  data.message = "Click the button to refresh the widget";
})();`,
})
```
