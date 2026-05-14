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
})