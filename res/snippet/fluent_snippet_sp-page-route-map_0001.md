# SPPageRouteMap API example: redirect an old home page to its replacement (portal-wide)
```typescript
import { SPPageRouteMap } from '@servicenow/sdk/core'

export const RedirectOldHome = SPPageRouteMap({
    $id: Now.ID['redirect-old-home'],
    routeFromPage: 'a4e3c21047132100ba13a5554ee49001',
    routeToPage: '07261a2147132100ba13a5554ee49092',
    shortDescription: 'Redirect old home page to new home page (2026 redesign)',
})
```
