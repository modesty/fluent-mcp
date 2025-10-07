# Create a Service Portal widget dependency for custom CSS styles

```typescript
import { SPWidgetDependency } from '@servicenow/sdk/core'

SPWidgetDependency({
    $id: Now.ID['custom_styles'],
    name: 'Custom Portal Styles',
    cssIncludes: `/* Custom CSS for portal widgets */
.custom-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.custom-button {
    background-color: #337ab7;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 3px;
    cursor: pointer;
}

.custom-button:hover {
    background-color: #286090;
}`,
    order: 50,
})
```
