# Create a simple Service Portal widget with HTML template, CSS, and server script

```typescript
import { SpWidget } from '@servicenow/sdk/core'

SpWidget({
    $id: Now.ID['hello_world_widget'],
    name: 'Hello World',
    description: 'A simple hello world widget',
    htmlTemplate: `<div class="panel panel-default">
  <div class="panel-heading">Hello World Widget</div>
  <div class="panel-body">
    {{c.data.greeting}}
  </div>
</div>`,
    cssTemplate: `.panel {
  margin-bottom: 20px;
}`,
    serverScript: `(function() {
  data.greeting = "Hello, World!";
})();`,
})
```
