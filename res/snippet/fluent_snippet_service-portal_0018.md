# Service Portal SPMenu API example: creating a navigation menu
```typescript
import { SPMenu } from '@servicenow/sdk/core'

SPMenu({
	$id: Now.ID['sp_main_navigation_menu'],
	title: 'Main Navigation',
	items: [
		{ label: 'Home', url: '?id=index', type: 'link', order: 100 },
		{ label: 'Service Catalog', url: '?id=sc_category', type: 'link', order: 200 },
		{ label: 'Knowledge Base', url: '?id=kb_view', type: 'link', order: 300 },
		{ label: 'My Requests', url: '?id=my_requests', type: 'link', order: 400 },
	],
	roles: 'itil,employee',
})
```
