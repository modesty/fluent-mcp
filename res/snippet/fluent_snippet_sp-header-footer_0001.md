# SPHeaderFooter API example: a static header that appears on every page in the portal
```typescript
import { SPHeaderFooter } from '@servicenow/sdk/core'

// In a real app, prefer Now.include('./header.html'), Now.include('./server-script.js'),
// Now.include('./client-script.js'), Now.include('./styles.css') for IDE support.
// Inline content is used here so the snippet is self-contained.
SPHeaderFooter({
    $id: Now.ID['static-header'],
    name: 'Static Portal Header',
    id: 'static-portal-header',
    description: 'Brand header shown on every portal page',
    static: true,
    hasPreview: true,
    htmlTemplate: '<nav class="navbar navbar-default navbar-fixed-top"><div class="container"><span class="navbar-brand">{{data.portalName}}</span></div></nav>',
    serverScript: '(function() { data.portalName = "Portal"; })();',
    clientScript: 'function HeaderController() {}',
    customCss: '.navbar-brand { font-weight: 600; }',
})
```
