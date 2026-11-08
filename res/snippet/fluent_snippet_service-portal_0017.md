# Service Portal SPTheme API example: creating a custom portal theme
```typescript
import { SPTheme } from '@servicenow/sdk/core'

SPTheme({
	$id: Now.ID['sp_corporate_dark_theme'],
	name: 'Corporate Dark Theme',
	// customCss holds the theme's SCSS variables (sp_theme.css_variables).
	// Use sp-rgb() with a UXF token and your color as the fallback, and end each with !default.
	customCss: `
$brand-primary:    sp-rgb(--now-color--primary-1, #1a73e8) !default;
$brand-success:    sp-rgb(--now-color_alert--positive-3, #34a853) !default;
$body-bg:          sp-rgb(--now-color_background--primary, #1e1e2e) !default;
$text-color:       sp-rgb(--now-color_text--primary, #e0e0e0) !default;
$navbar-inverse-bg: sp-rgb(--now-color_background--secondary, #2d2d44) !default;
$font-family-sans-serif: 'Inter', sans-serif !default;
`,
	turnOffScssCompilation: false, // must stay false when customCss uses $variables or sp-rgb()
	// header / footer take an SPHeaderFooter object you define, or an OOTB sp_header_footer sys_id
	header: 'bf5ec2f2cb10120000f8d856634c9c0c', // OOTB Stock Header
	footer: 'feb4f763df121200ba13a4836bf26320', // OOTB Sample Footer
	fixedHeader: true,
})
```
