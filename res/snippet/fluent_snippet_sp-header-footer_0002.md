# SPHeaderFooter API example: a non-static footer placed selectively on specific pages
```typescript
import { SPHeaderFooter } from '@servicenow/sdk/core'

// In a real app, prefer Now.include('./server-script.js') and Now.include('./styles.css')
// for IDE support. Inline content is used here so the snippet is self-contained.
SPHeaderFooter({
    $id: Now.ID['dynamic-footer'],
    name: 'Dynamic Footer',
    id: 'dynamic-footer',
    description: 'Footer that pages opt into individually via their portal-builder configuration',
    static: false,
    hasPreview: true,
    htmlTemplate:
        '<footer class="footer"><div class="container"><p>&copy; 2026 My Company — All rights reserved.</p></div></footer>',
    serverScript: '(function() { /* no-op server hook */ })();',
    customCss: '.footer { padding: 1rem 0; background: #f5f5f5; }',
})
```
