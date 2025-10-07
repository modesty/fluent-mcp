# Create a simple static HTML UI Page

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['simple_welcome_page'],
    endpoint: 'x_myapp_welcome.do',
    description: 'A simple welcome page with static HTML content',
    category: 'general',
    html: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1>Welcome to My Application</h1>
            <p>This is a custom UI page built with ServiceNow Fluent.</p>
            <div class="alert alert-info">
                <strong>Info:</strong> You can customize this page by editing the html property.
            </div>
        </div>
    `,
})
```
