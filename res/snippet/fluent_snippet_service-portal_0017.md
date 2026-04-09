# Service Portal SPTheme API example: creating a custom portal theme
```typescript
import { SPTheme } from '@servicenow/sdk/core'

SPTheme({
	$id: Now.ID['sp_corporate_dark_theme'],
	name: 'Corporate Dark Theme',
	cssVariables: `
		--sp-primary-color: #1a73e8;
		--sp-secondary-color: #34a853;
		--sp-background-color: #1e1e2e;
		--sp-text-color: #e0e0e0;
		--sp-navbar-bg: #2d2d44;
		--sp-font-family: 'Inter', sans-serif;
	`,
	header: Now.ID['sp_corporate_header_widget'],
	footer: Now.ID['sp_corporate_footer_widget'],
})
```
