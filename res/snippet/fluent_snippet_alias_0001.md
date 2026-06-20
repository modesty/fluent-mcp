# Alias API example: basic HTTP connection alias for an external API
```typescript
import { Alias } from '@servicenow/sdk/core'

Alias({
	$id: Now.ID['my_http_alias'],
	name: 'My HTTP Connection',
	description: 'HTTP connection for external API',
})
```
