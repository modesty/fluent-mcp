# Create a Service Portal widget with option schema for configuration

```typescript
import { SpWidget } from '@servicenow/sdk/core'

SpWidget({
    $id: Now.ID['configurable_widget'],
    name: 'Configurable Widget',
    description: 'Widget with configurable options',
    htmlTemplate: `<div>
  <h3>{{c.options.title}}</h3>
  <p>{{c.options.message}}</p>
</div>`,
    optionSchema: `[
  {
    "name": "title",
    "label": "Widget Title",
    "type": "string",
    "default_value": "Default Title"
  },
  {
    "name": "message",
    "label": "Message",
    "type": "string",
    "default_value": "Default message text"
  }
]`,
})
```
