# Create a simple Service Portal widget with HTML template, CSS, and server script

```typescript
import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['hello_world_widget'],
    name: 'Hello World',
    description: 'A simple hello world widget',
    htmlTemplate: `<div class="panel panel-default">
  <div class="panel-heading">Hello World Widget</div>
  <div class="panel-body">
    {{c.data.greeting}}
  </div>
</div>`,
    customCss: `.panel {
  margin-bottom: 20px;
}`,
    serverScript: `(function() {
  data.greeting = "Hello, World!";
})();`,
})
```
