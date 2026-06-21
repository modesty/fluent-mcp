# Alias API example: HTTP connection alias composing a RetryPolicy inline
```typescript
import { Alias, RetryPolicy } from '@servicenow/sdk/core'

Alias({
	$id: Now.ID['resilient_http_alias'],
	name: 'Resilient HTTP Connection',
	connectionType: 'httpConnection',
	description: 'HTTP connection that retries on transient failures',
	retryPolicy: RetryPolicy({
		$id: Now.ID['resilient_http_alias_retry'],
		name: 'Resilient HTTP Retry',
		connectionType: 'http_retry_conditions',
		retryStrategy: 'exponential_backoff',
		count: 4,
		interval: 5,
		condition: 'status_codeIN429,500,502,503,504',
	}),
})
```
