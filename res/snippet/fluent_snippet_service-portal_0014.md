# Create a Service Portal Angular Provider as a constant

```typescript
import { SpAngularProvider } from '@servicenow/sdk/core'

SpAngularProvider({
    $id: Now.ID['app_config'],
    name: 'APP_CONFIG',
    type: 'constant',
    script: `{
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
}`,
})
```
