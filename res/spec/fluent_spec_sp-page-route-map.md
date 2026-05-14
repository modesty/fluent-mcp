# **Context**: SPPageRouteMap spec: Used to create a Service Portal page route map — a redirect rule that automatically routes users from one page to another within a portal (`sp_page_route_map`). Route maps can be scoped to specific portals and roles, with priority ordering when multiple rules match.

```typescript
// Creates a Service Portal page route map (`sp_page_route_map`)
import { SPPageRouteMap } from '@servicenow/sdk/core'

SPPageRouteMap({
  $id: '',                    // string | number | ExplicitKey<string>, mandatory
  routeFromPage: '',          // PageRef, mandatory — source page (sys_id, Record<'sp_page'>, or SPPage())
  routeToPage: '',            // PageRef, mandatory — destination page

  active: true,               // boolean, optional, default true
  order: 10,                  // number, optional, default 10 — evaluation priority
                              //   Lower values are evaluated first when multiple routes match.
  portals: [],                // PortalRef[], optional — portals this mapping is scoped to
                              //   Accepts sys_id strings, Record<'sp_portal'>, or ServicePortal()
                              //   Omit or leave empty to apply across all portals.
  roles: [],                  // (string | Role | Record<'sys_user_role'>)[], optional
                              //   Roles whose members follow this route.
                              //   Omit or leave empty to apply to all users.
  shortDescription: '',       // string, optional — admin-facing description
}): SPPageRouteMap
```

## Notes

- A user navigating to `routeFromPage` is redirected to `routeToPage` subject to the `portals` and `roles` filters.
- When multiple matching rules exist for the same source page+portal, the one with the lowest `order` wins.
- Page references can be plain sys_ids, but the typed `Record<'sp_page'>` / `SPPage()` forms are preferred for compile-time safety and cross-file references.
