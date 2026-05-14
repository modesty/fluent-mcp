# Instructions for Fluent SPHeaderFooter API
Always reference the SPHeaderFooter API specifications for more details.
1. SPHeaderFooter is the typed companion to a regular `sp_widget`, specialized for portal headers and footers via the `static` positioning field.
2. `static: true` makes the header/footer render on every portal page automatically. `static: false` is selective placement — you opt into it per page (typically via the page's header/footer field in the portal builder or via a `Record<'sp_page'>`).
3. Use `Now.include('./server-script.js')`, `Now.include('./client-script.js')`, `Now.include('./styles.css')` for `serverScript`, `clientScript`, `linkScript`, `customCss`, and `htmlTemplate` content. Inline strings are supported but become unreadable past trivial size.
4. `id` is the public widget id (used by portal templates to reference the widget). Must contain only alphanumeric, `-`, or `_`. Keep it stable across releases.
5. `category` defaults to `'custom'`. Use `'servicePortal'` when the widget is intended as a portal-level building block; reserve `'standard'` / ServiceNow-prefixed categories for SN-shipped content.
6. `controllerAs` defaults to `'c'` — only change when you have a clear reason (e.g. matching legacy templates).
7. The `fields` array exposes specific `sp_widget` columns to the widget's `data`/`options` object. Most headers/footers do not need this.
8. `angularProviders` and `dependencies` reuse the regular widget mechanisms. Reference `Record<'sp_angular_provider'>` / `Record<'sp_dependency'>` rather than embedding sys_ids inline where possible.
9. `roles` restricts who sees the header/footer. Leave empty for a public portal header; require roles for admin/internal banners.
10. Public-facing portals: set `public: true` deliberately. Internal experiments / WIP widgets: set `internal: true` to keep them out of the standard editor.
11. Do not set `servicenow: true` unless your app scope is `sn_` / `snc_` prefixed — the build will reject it otherwise.
