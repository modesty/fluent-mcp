# RetryPolicy API example: HTTP policy with exponential backoff on rate-limit and 5xx responses
```typescript
import { RetryPolicy } from '@servicenow/sdk/core'

export const httpRetryPolicy = RetryPolicy({
	$id: Now.ID['rest-exponential-retry'],
	name: 'REST API Exponential Backoff',
	connectionType: 'http_retry_conditions',
	retryStrategy: 'exponential_backoff',
	count: 5,
	interval: 5,
	condition: 'status_codeIN429,500,502,503,504',
	restrictTo: ['status_code', 'error'],
})
```
