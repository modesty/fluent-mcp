# Service Portal SPPage API example: creating a custom portal page
```typescript
import { SPPage } from '@servicenow/sdk/core'

SPPage({
	// SPPage takes no $id: pageId is the record's identity and the ?id=<pageId> used to route to it
	pageId: 'knowledge_hub',
	title: 'Knowledge Hub',
	shortDescription: 'Central knowledge base page with search and featured articles',
	public: false,
	roles: ['itil', 'knowledge'], // users need at least one of these roles
	category: 'kb',
})
```
