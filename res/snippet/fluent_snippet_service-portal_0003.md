# Create a Service Portal widget with option schema for configuration

```typescript
import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['configurable_widget'],
    name: 'Configurable Widget',
    description: 'Widget with configurable options',
    htmlTemplate: `<div>
  <h3>{{c.options.title}}</h3>
  <p>{{c.options.message}}</p>
</div>`,
    optionSchema: [
        {
            name: 'title',
            label: 'Widget Title',
            section: 'Presentation',
            type: 'string',
            defaultValue: 'Default Title',
        },
        {
            name: 'message',
            label: 'Message',
            section: 'Presentation',
            type: 'string',
            defaultValue: 'Default message text',
        },
    ],
})
```
