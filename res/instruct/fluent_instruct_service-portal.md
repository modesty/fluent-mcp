# Instructions for Fluent Service Portal APIs

Always reference the Service Portal API specifications for more details.

## ServicePortal API

1. Import `ServicePortal` from `@servicenow/sdk/core`. It creates the `sp_portal` record -- the top-level container every other Service Portal component hangs off. `$id`, `title`, and `urlSuffix` are all mandatory.
2. `urlSuffix` is the path the portal is served at (`urlSuffix: 'esc'` -> `/<instance>/esc`). It MUST be unique across the instance -- query `sp_portal` with `url_suffix=<value>` before creating, and prefix it with your app scope. Values must be lowercase; hyphens and underscores are allowed (the build validator accepts hyphens as of SDK v4.10.1 -- it previously rejected them even though the API documented them), and it cannot start or end with an underscore.
3. **Logo fallback is REQUIRED.** If the portal has no logo asset, generate one (for example an SVG carrying the portal initials) and set `logo` to it. When `logo` is unset the OOTB header silently falls back to plain text -- no build error and no visual signal that branding is missing. Always pair `logo` with `logoAltText` for screen readers.
4. Pass the imported Fluent object (`SPPage()`, `SPMenu()`, `SPTheme()`) for records your application owns, and a 32-character sys_id string for OOTB records. A page `id` string such as `'my-portal-home'` is NOT a valid `homePage` value -- it silently falls back to the OOTB home page.
5. `mainMenu` only renders when the portal also has a `theme` whose `header` is set. All three are required together: portal `theme` + theme `header` + portal `mainMenu`.
6. ITSM / content integration fields select which OOTB pages and data sources the portal uses -- they are portal configuration, not `SPPageRouteMap` redirects: `catalogHomePage`, `categoryHomePage`, `knowledgeHomePage`, plus the ordered arrays `catalogs`, `knowledgeBases`, `searchSources`, and `taxonomies`. Verify every OOTB sys_id against the target instance; they differ across instances and releases.
7. Use the plural array forms `catalogs` / `knowledgeBases`. The singular `catalog` / `knowledgeBase` properties are deprecated and mutually exclusive with the arrays -- setting both fails to compile.
8. Search wiring: `enableAiSearch` requires both `searchApplication` and `searchResultsConfiguration`. `textIndexGroup` scopes what text is indexed; `searchSources` orders the result groupings.
9. `defaultPortal: true` should exist on at most one portal per instance -- it is the portal used when navigating via `/?id=<pageId>` with no suffix.
10. `inactive: true` takes the portal offline; set `alternatePortal` so users are redirected somewhere useful instead of hitting a dead portal.
11. Portal-level styling: `cssVariables` is a JSON string of CSS custom properties that override the theme's variables portal-wide. Prefer `SPTheme.customCss` for real theming and reserve `cssVariables` for per-portal token overrides.

## SPWidget API

1. **Templates and Controllers**:
   - Use AngularJS data binding: `{{c.data.property}}` (controller accessible as `c` by default)
   - Override controller alias with `controllerAs` property if needed
   - Use `customCss` for widget-scoped SCSS or CSS styling (SCSS is compiled server-side; replaces the legacy `cssTemplate` / `sassSrc` properties)
   - Use `templates` array to define additional Angular templates: `[{$id, id, htmlTemplate}]`. These are the `sp_ng_template` records -- there is no separate template API to call, author them on the owning widget.

2. **Scripts**:
   - **Client script**: AngularJS controller function. Use `c.server.get()` or `c.server.update()` to communicate with server
   - **Server script**: Runs before rendering. Access `input`, store data in `data`, use `options` for widget configuration
   - **Link script** (`linkScript`): Client-side AngularJS link function for direct DOM manipulation. Avoid unless necessary

3. **Configuration**:
   - Define `optionSchema` as an array of WidgetOption objects: `{name, label, section, type, defaultValue?, hint?}`
   - Use `fields` to specify which fields from `dataTable` are available. It is typed against that table's schema (`keyof FullSchema` plus `SystemColumns`), and unmodeled names still compile as plain strings. It maps to the `field_list` column and drives the field picker in the Service Portal designer.
   - Widget option types: `'string'`, `'boolean'`, `'integer'`, `'reference'`, `'choice'`, `'field_list'`, `'field_name'`, `'glide_list'`, `'glyphicon'`

4. **Security**:
   - Set `roles` property (array of strings, Role objects, or Record references) to restrict visibility
   - Use `public: true` for unauthenticated access
   - Always check `gs.hasRole()` in server script for sensitive operations

5. **Dependencies and Providers**:
   - Use `dependencies` array to attach SPWidgetDependency records for client-side libraries (JS/CSS). On an SPWidgetDependency the Angular module is named by `angularModuleName` -- there is no `module` property.
   - Use `angularProviders` array to attach SPAngularProvider records for reusable Angular components
   - Use `docs` property to link to widget documentation (`sp_documentation`)

6. **Cross-cutting record metadata** (available on every Service Portal API):
   - `protectionPolicy: 'read' | 'protected'` controls post-install access for other developers: `'read'` lets them view but not change, `'protected'` blocks changes entirely; omit it to allow customization.
   - `$override` sets unmodeled columns by database column name -- an untyped escape hatch, use it only when the API has no property for the field.
   - `$meta.installMethod` (`'first install'` | `'demo'` | `'once'`) routes the record to a conditional output folder.
   - `$meta.useEsLatest: true` (SDK v4.10.1+) runs this record's server-side script field(s) with the latest supported ECMAScript version rather than the application's default. Omit it to leave the `sys_app` / `now.config.json` default in place. It applies to all fields defined for the entity, so it is a per-record switch, not a per-field one.
   - `SPPageRouteMap` is the one exception: its type omits the metadata mixin, so `$meta` is not available there (`protectionPolicy` and `$override` still are).

## SPWidgetDependency API

1. **Loading**:
   - `jsIncludes` and `cssIncludes` are ordered arrays: `[{order: number, include: ...}]`. Lower order values load first.
   - Each JS include can reference a URL or a `sys_ui_script` (but not both). Each CSS include can reference a URL or an `sp_css` record (but not both).
   - Set `includeOnPageLoad: true` to load the dependency on page load instead of on-demand.
   - Use `portalsForPageLoad` to restrict page-load inclusion to specific portals.

2. **Angular Modules**:
   - Set `angularModuleName` when including Angular modules
   - Module name must match the actual Angular module name

3. **CSS Includes**:
   - CssInclude supports `rtlCssUrl` for RTL language stylesheets and `lazyLoad` for deferred loading.

## SPAngularProvider API

1. **Provider Types** (lowercase, default: `'directive'`):
   - **directive**: Reusable UI components. Use `restrict: 'E'` for elements, `'A'` for attributes
   - **factory**: Returns object/function, more flexible than service
   - **service**: Business logic, instantiated as singleton with `new`

2. **Dependencies**:
   - Use `requires` array to declare dependencies on other Angular providers
   - Accepts strings (provider names), Record references, or SPAngularProvider objects

3. **Best Practices**:
   - Inject dependencies as function parameters: `$http`, `$q`, `$timeout`, `$sce`
   - Name services/factories in PascalCase, directives in camelCase
   - Don't manipulate DOM in services/factories -- use directives
   - Always handle promise rejections with error callbacks

## SPPage API (SDK v4.5.0)

1. Import `SPPage` from `@servicenow/sdk/core`. The `pageId` field is mandatory and must be unique -- it is the URL-level identifier used in routing (`?id=<pageId>`).
2. Use `title` for the browser tab title, and `shortDescription` for an admin-visible description.
3. Set `public: true` to make a page accessible without authentication. Use `roles` (array) to restrict access to specific roles.
4. Pages use a hierarchical layout via `containers`: each SPContainer holds `rows`, each SPRow holds `columns`, each SPColumn holds `instances` (SPInstance) and optional `nestedRows`. `$id` is mandatory on every one of those nested nodes -- each becomes its own record. Column `size` is a 1-12 literal union (not an open number), and `semanticTag` accepts only `'main'`.
5. SPInstance binds a widget to a position on the page via the `widget` property, with `widgetParameters` for configuration. Prefer the plain object form -- `widgetParameters: { param1: 'value1' }` -- which the build plugin serializes for you as of SDK v4.10.1; earlier releases passed the object through unserialized. A JSON string and `Now.include('./params.json')` are also accepted. Keys must match the widget's `optionSchema` `name` values, and the server script reads them from `options`. Booleans arrive as real booleans from an object form but as `'true'` / `'false'` strings from a JSON string, so compare defensively.
6. Use `asyncLoad: true` on SPInstance with `asyncLoadTrigger` (`'viewport'` or `'parallel'`) to defer widget rendering for performance. The placeholder controls -- `preservePlaceholderSize`, `placeholderDimensions` (needs `advancedPlaceholderDimensions: true`), `placeholderConfigurationScript`, and `placeholderTemplate` -- are honored by the build as of SDK v4.10.1; earlier releases accepted them but wrote hardcoded defaults instead, so treat any pre-4.10.1 layout tuning as untested. Use `preservePlaceholderSize` to avoid layout shift while async content loads.
7. SEO support: set `useSeoScript: true` and provide a `seoScript` (script include) for dynamic title/meta tags. Alternatively use `dynamicTitleStructure` for template-based titles.
8. Use `humanReadableUrlStructure` with `{variable}` placeholders (e.g. `'knowledge/{sys_id}'`) for friendly URLs.
9. Set `omitWatcher: true` to disable AngularJS `$watch` on static/data-light pages for improved performance.
10. Use `category` to organize pages in the portal designer (values: `'custom'`, `'standard'`, `'sample'`, `'sp_platform'`, `'kb'`, `'other'`, `'sc'`, `'sn_ex_sp_taxonomy'`).

## SPTheme API (SDK v4.5.0)

1. Import `SPTheme` from `@servicenow/sdk/core`. The `$id` and `name` fields are mandatory.
2. Use the theme's `customCss` (not the portal's `cssVariables`) for SCSS variable definitions that control theme-wide colors, fonts, and spacing (e.g. `$nav-color: #333; $brand-primary: #0070d2;`). Use `sp-rgb()` and `sp-rgba()` helpers for dynamic color variables.
3. Use `header` and `footer` to reference `sp_header_footer` widget instances. Set `fixedHeader` / `fixedFooter` (both default `true`) to control sticky behavior.
4. Set `turnOffScssCompilation: true` if `customCss` contains plain CSS custom properties instead of SCSS syntax.
5. Use `matchingNextExperienceTheme` to link to a Next Experience (`sys_ux_theme`) for consistent branding across portal and workspace UIs.
6. Use `icon` and `logo` for portal favicon and header logo. Both accept a `user_image` sys_id or `Now.attach('path/to/image.png')`. Set `logoAltText` for accessibility.
7. Use `cssIncludes` and `jsIncludes` (ordered arrays: `[{order, include}]`) to load global CSS/JS files on every page using the theme.

## SPMenu API (SDK v4.5.0)

1. Import `SPMenu` from `@servicenow/sdk/core`. SPMenu extends SPInstance, so it inherits all widget instance properties (`title`, `widget`, `roles`, etc.) including its mandatory `$id`.
2. Define navigation items in the `items` array. Each SPMenuItem requires `$id` and `label`, and supports eleven link types via `type`, taken from the `sp_rectangle_menu_item` type choice list: `'page'`, `'url'`, `'sc'` (Service Catalog), `'sc_category'`, `'sc_cat_item'`, `'kb'` (Knowledge Base), `'kb_topic'`, `'kb_article'`, `'kb_category'`, `'filtered'`, `'scripted'` (default: `'page'`). A `'page'` item with no `page` set renders but navigates nowhere.
3. Menu items support one level of nesting via `childItems` (LeafMenuItem[], same shape as SPMenuItem -- `$id` still mandatory -- but without further children).
4. Use `condition` for server-side visibility (encoded query), `roles` for role-based visibility, and `active` to toggle display.
5. For filtered menus (`type: 'filtered'`), set `table`, `filter`, `display1`, `display2`, and `displayDate`.
6. For scripted menus (`type: 'scripted'`), provide a `script` function that dynamically generates child items. Use `Now.include()` to keep scripts in separate files.
