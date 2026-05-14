# Instructions for Fluent SPPageRouteMap API
Always reference the SPPageRouteMap API specifications for more details.
1. SPPageRouteMap is the typed wrapper for `sp_page_route_map` — pure redirect configuration. It does not host scripts, layouts, or widgets.
2. `routeFromPage` and `routeToPage` accept sys_id strings, `Record<'sp_page'>` references, or `SPPage()` expressions. Prefer the typed forms — they catch missing-page mistakes at build time.
3. `portals: []` (or omitted) means the route applies across all portals. To scope to specific portals, supply sys_ids, `Record<'sp_portal'>`, or `ServicePortal()` references.
4. `roles: []` (or omitted) means the route applies to all users. To scope to specific roles, supply role name strings, `Role()`, or `Record<'sys_user_role'>` references.
5. `order` controls priority when multiple route maps match the same source page in the same portal. Lower numbers win. Default is 10 — use 1–9 for higher-priority overrides, 11+ for less-priority defaults.
6. `active: false` disables the route without deleting it — useful during cutover or A/B testing redirects.
7. `shortDescription` is purely admin-facing. Use it to explain *why* the redirect exists ("Old home page → new home page after 2026 redesign") — operators read this when troubleshooting unexpected redirects.
8. Avoid circular routes: a page that redirects to itself, or A→B→A loops. The platform will detect the loop at request time, but build-time avoidance saves operator confusion.
9. Routes are evaluated at the start of each portal page request, so they incur a per-request cost. Keep the rule set small and prefer explicit routing where feasible.
10. For temporary redirects (events, migrations), pair the route map with a deactivation date in the surrounding deployment workflow rather than relying on humans to remember to delete it.
