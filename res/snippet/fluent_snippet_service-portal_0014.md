# Create a Service Portal Angular Provider for shared configuration values

An `sp_angular_provider` is a `directive`, `factory` or `service` only; there is no `constant` type. A factory that
returns a plain object gives widgets the same shared, injectable configuration.

```typescript
import { SPAngularProvider } from '@servicenow/sdk/core'

SPAngularProvider({
    $id: Now.ID['app_config'],
    name: 'AppConfig',
    type: 'factory',
    script: `function() {
    return {
        apiVersion: 'v1',
        itemsPerPage: 25,
        defaultLanguage: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm:ss',
        statusValues: {
            NEW: 1,
            IN_PROGRESS: 2,
            CLOSED: 3,
            CANCELLED: 4
        },
        errorMessages: {
            generic: 'An error occurred. Please try again.',
            notFound: 'The requested resource was not found.',
            unauthorized: 'You do not have permission to access this resource.'
        }
    };
}`,
})
```
