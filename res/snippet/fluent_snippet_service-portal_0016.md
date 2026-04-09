# Service Portal SPPage API example: creating a custom portal page
```typescript
import { SPPage } from '@servicenow/sdk/core'

SPPage({
	$id: Now.ID['sp_knowledge_portal_page'],
	title: 'Knowledge Hub',
	description: 'Central knowledge base page with search and featured articles',
	public: false,
	roles: 'itil,knowledge',
	category: 'Knowledge Management',
})
```
