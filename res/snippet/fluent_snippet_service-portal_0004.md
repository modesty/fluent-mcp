# Create a Service Portal widget with SASS styling

```typescript
import { SpWidget } from '@servicenow/sdk/core'

SpWidget({
    $id: Now.ID['sass_styled_widget'],
    name: 'SASS Styled Widget',
    description: 'Widget using SASS for styling',
    htmlTemplate: `<div class="custom-widget">
  <div class="widget-header">
    <h3>{{c.data.title}}</h3>
  </div>
  <div class="widget-body">
    <p>{{c.data.content}}</p>
  </div>
</div>`,
    sassSrc: `$primary-color: #337ab7;
$padding: 15px;

.custom-widget {
  padding: $padding;
  border: 1px solid #ddd;
  
  .widget-header {
    background-color: $primary-color;
    color: white;
    padding: $padding / 2;
    margin: -$padding -$padding $padding -$padding;
    
    h3 {
      margin: 0;
    }
  }
  
  .widget-body {
    padding: $padding / 2;
  }
}`,
    serverScript: `(function() {
  data.title = "SASS Example";
  data.content = "This widget uses SASS for styling";
})();`,
})
```
