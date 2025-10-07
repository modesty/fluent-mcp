# Create a Service Portal widget with link function for DOM manipulation

```typescript
import { SpWidget } from '@servicenow/sdk/core'

SpWidget({
    $id: Now.ID['link_function_widget'],
    name: 'Widget with Link Function',
    description: 'Widget demonstrating link function usage',
    htmlTemplate: `<div>
  <h3>Link Function Example</h3>
  <div id="dynamic-content"></div>
</div>`,
    linkFunction: `function(scope, element, attrs, controller) {
  // Direct DOM manipulation using link function
  var contentDiv = element.find('#dynamic-content');
  contentDiv.html('<p>Content added via link function</p>');
  
  // Access controller data
  contentDiv.append('<p>Server data: ' + controller.data.message + '</p>');
}`,
    serverScript: `(function() {
  data.message = "Hello from server";
})();`,
})
```
