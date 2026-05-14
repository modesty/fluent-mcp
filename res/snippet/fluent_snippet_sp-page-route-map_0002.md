# SPPageRouteMap API example: portal-scoped redirect that applies only to ITIL/admin users
```typescript
import { SPPageRouteMap } from '@servicenow/sdk/core'

export const ItilDashboardRedirect = SPPageRouteMap({
    $id: Now.ID['dashboard-redirect'],
    routeFromPage: 'b5f4d31047132100ba13a5554ee49002',
    routeToPage: 'c6e5e42047132100ba13a5554ee49003',
    shortDescription: 'Route ITIL/admin users to the new operations dashboard',
    portals: ['fe12dbbed14bd3f712f0787141c2f656'],
    roles: ['itil', 'admin'],
    active: true,
    order: 50,
})
```
