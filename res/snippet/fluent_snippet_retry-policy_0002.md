# RetryPolicy API example: honor the HTTP Retry-After header with a bounded time budget
```typescript
import { RetryPolicy } from '@servicenow/sdk/core'

export const retryAfterPolicy = RetryPolicy({
	$id: Now.ID['retry-after-policy'],
	name: 'Honour Retry-After Header',
	connectionType: 'http_retry_conditions',
	retryStrategy: 'retry_after',
	maxElapsedTime: 120,
	condition: 'status_codeIN429,503',
	restrictTo: ['status_code'],
})
```
