# Create a direct UI Page without ServiceNow chrome

```typescript
import { UiPage } from '@servicenow/sdk/core'

UiPage({
    $id: Now.ID['direct_landing_page'],
    endpoint: 'x_myapp_landing.do',
    description: 'A direct UI page that loads without ServiceNow navigation wrapper',
    direct: true,
    category: 'general',
    html: `
        <!DOCTYPE html>
        <html>
        <head>
            <title>My Custom Landing Page</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .container {
                    text-align: center;
                    max-width: 600px;
                    padding: 40px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome to Our Application</h1>
                <p>This is a custom landing page without ServiceNow chrome.</p>
                <button onclick="window.location.href='welcome.do'">Enter Application</button>
            </div>
        </body>
        </html>
    `,
})
```
