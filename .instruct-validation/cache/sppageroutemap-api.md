# Function: SPPageRouteMap(config)

Creates a Service Portal page route map — a redirect rule that automatically routes users from one page to another within a portal (`sp_page_route_map`). Route maps can be scoped to specific portals and roles, and support priority ordering when multiple rules match the same source page.

## Parameters

### config

`SPPageRouteMap`

**Properties:**

- **$id** (required): `string | number | ExplicitKey<string>`

- **routeFromPage** (required): `PageRef`
  The source page. When a portal user navigates to this page, they are
  redirected to `routeToPage` (subject to `roles` and `portals` filters).

- **routeToPage** (required): `PageRef`
  The destination page the user is redirected to.

- **active** (optional, default: true): `boolean`
  Whether this route mapping is active.

- **order** (optional, default: 10): `number`
  Evaluation priority when multiple routes match the same source page and portal.
  Lower values are evaluated first.

- **portals** (optional): `PortalRef[]`
  Portals this mapping is scoped to. Omit or leave empty to apply to all portals.
  Accepts sys_id strings, `Record<'sp_portal'>` references, or `ServicePortal()` expressions.

- **roles** (optional): `(string | Role | Record<'sys_user_role'>)[]`
  Roles whose members follow this route. Omit or leave empty to apply to all users.
  Accepts role name strings, `Role()` expressions, or `Record<'sys_user_role'>` references.

- **shortDescription** (optional): `string`
  Admin-facing description of what this route mapping does.



## Examples

### sp-page-route-map-basic

```typescript
// Source: packages/api/tests/service-portal/page-route-map-plugin.test.ts

import { SPPageRouteMap } from '@servicenow/sdk/core'

export const BasicRouteMapExample = SPPageRouteMap({
    $id: Now.ID['redirect-old-home'],
    routeFromPage: 'a4e3c21047132100ba13a5554ee49001',
    routeToPage: '07261a2147132100ba13a5554ee49092',
    shortDescription: 'Redirect old home page to new home page',
})

```

### sp-page-route-map-with-portals-and-roles

```typescript
// Source: packages/api/tests/service-portal/page-route-map-plugin.test.ts

import { SPPageRouteMap } from '@servicenow/sdk/core'

export const PortalScopedRouteMapExample = SPPageRouteMap({
    $id: Now.ID['dashboard-redirect'],
    routeFromPage: 'b5f4d31047132100ba13a5554ee49002',
    routeToPage: 'c6e5e42047132100ba13a5554ee49003',
    shortDescription: 'Redirect to new dashboard for ITIL users',
    portals: ['fe12dbbed14bd3f712f0787141c2f656'],
    roles: ['itil', 'admin'],
    active: true,
    order: 50,
})

```

