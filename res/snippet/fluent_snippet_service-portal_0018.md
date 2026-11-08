# Service Portal SPMenu API example: creating a navigation menu
```typescript
import { SPMenu } from '@servicenow/sdk/core'

SPMenu({
	$id: Now.ID['sp_main_navigation_menu'],
	title: 'Main Navigation',
	// A 'url' item navigates to `url`. For an app-owned page, use type 'page' with an SPPage object;
	// every item needs its own $id.
	items: [
		{ $id: Now.ID['sp_main_nav_home'], label: 'Home', type: 'url', url: '?id=index', order: 100 },
		{ $id: Now.ID['sp_main_nav_catalog'], label: 'Service Catalog', type: 'url', url: '?id=sc_home', order: 200 },
		{ $id: Now.ID['sp_main_nav_knowledge'], label: 'Knowledge Base', type: 'url', url: '?id=kb_view', order: 300 },
		{ $id: Now.ID['sp_main_nav_requests'], label: 'My Requests', type: 'url', url: '?id=requests', order: 400 },
	],
	roles: ['itil', 'employee'], // the menu is visible to users with at least one of these roles
})
```
