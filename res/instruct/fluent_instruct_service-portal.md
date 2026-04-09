# Instructions for Fluent Service Portal APIs

Always reference the Service Portal API specifications for more details.

## SPWidget API

1. **Templates and Controllers**:
   - Use AngularJS data binding: `{{c.data.property}}` (controller accessible as `c` by default)
   - Override controller alias with `controllerAs` property if needed
   - Use `customCss` for widget-scoped CSS styling (replaces the legacy `cssTemplate` / `sassSrc` properties)
   - Use `templates` array to define additional Angular templates: `[{$id, id, htmlTemplate}]`

2. **Scripts**:
   - **Client script**: AngularJS controller function. Use `c.server.get()` or `c.server.update()` to communicate with server
   - **Server script**: Runs before rendering. Access `input`, store data in `data`, use `options` for widget configuration
   - **Link script** (`linkScript`): Client-side AngularJS link function for direct DOM manipulation. Avoid unless necessary

3. **Configuration**:
   - Define `optionSchema` as an array of WidgetOption objects: `{name, label, section, type, defaultValue?, hint?}`
   - Use `fields` (array of strings) to specify which fields from `dataTable` are available (replaces the legacy `field_list` string property)
   - Widget option types: `'string'`, `'boolean'`, `'integer'`, `'reference'`, `'choice'`, `'field_list'`, `'field_name'`, `'glide_list'`, `'glyphicon'`

4. **Security**:
   - Set `roles` property (array of strings, Role objects, or Record references) to restrict visibility
   - Use `public: true` for unauthenticated access
   - Always check `gs.hasRole()` in server script for sensitive operations

5. **Dependencies and Providers**:
   - Use `dependencies` array to attach SPWidgetDependency records for client-side libraries (JS/CSS)
   - Use `angularProviders` array to attach SPAngularProvider records for reusable Angular components
   - Use `docs` property to link to widget documentation (`sp_documentation`)

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
4. Pages use a hierarchical layout via `containers`: each SPContainer holds `rows`, each SPRow holds `columns`, each SPColumn holds `instances` (SPInstance) and optional `nestedRows`.
5. SPInstance binds a widget to a position on the page via the `widget` property, with `widgetParameters` for configuration.
6. Use `asyncLoad: true` on SPInstance with `asyncLoadTrigger` (`'viewport'` or `'parallel'`) to defer widget rendering for performance.
7. SEO support: set `useSeoScript: true` and provide a `seoScript` (script include) for dynamic title/meta tags. Alternatively use `dynamicTitleStructure` for template-based titles.
8. Use `humanReadableUrlStructure` with `{variable}` placeholders (e.g. `'knowledge/{sys_id}'`) for friendly URLs.
9. Set `omitWatcher: true` to disable AngularJS `$watch` on static/data-light pages for improved performance.
10. Use `category` to organize pages in the portal designer (values: `'custom'`, `'standard'`, `'sample'`, `'sp_platform'`, `'kb'`, `'other'`, `'sc'`, `'sn_ex_sp_taxonomy'`).

## SPTheme API (SDK v4.5.0)

1. Import `SPTheme` from `@servicenow/sdk/core`. The `$id` and `name` fields are mandatory.
2. Use `customCss` (not `cssVariables`) for SCSS variable definitions that control theme-wide colors, fonts, and spacing (e.g. `$nav-color: #333; $brand-primary: #0070d2;`). Use `sp-rgb()` and `sp-rgba()` helpers for dynamic color variables.
3. Use `header` and `footer` to reference `sp_header_footer` widget instances. Set `fixedHeader` / `fixedFooter` (both default `true`) to control sticky behavior.
4. Set `turnOffScssCompilation: true` if `customCss` contains plain CSS custom properties instead of SCSS syntax.
5. Use `matchingNextExperienceTheme` to link to a Next Experience (`sys_ux_theme`) for consistent branding across portal and workspace UIs.
6. Use `icon` and `logo` for portal favicon and header logo. Both accept a `user_image` sys_id or `Now.attach('path/to/image.png')`. Set `logoAltText` for accessibility.
7. Use `cssIncludes` and `jsIncludes` (ordered arrays: `[{order, include}]`) to load global CSS/JS files on every page using the theme.

## SPMenu API (SDK v4.5.0)

1. Import `SPMenu` from `@servicenow/sdk/core`. SPMenu extends SPInstance, so it inherits all widget instance properties (`title`, `widget`, `roles`, etc.).
2. Define navigation items in the `items` array. Each SPMenuItem requires a `label` and supports many link types via `type`: `'page'`, `'url'`, `'sc_category'`, `'sc_cat_item'`, `'kb_topic'`, `'kb_article'`, `'kb_category'`, `'filtered'`, `'scripted'` (default: `'page'`).
3. Menu items support one level of nesting via `childItems` (LeafMenuItem[], same shape as SPMenuItem but without further children).
4. Use `condition` for server-side visibility (encoded query), `roles` for role-based visibility, and `active` to toggle display.
5. For filtered menus (`type: 'filtered'`), set `table`, `filter`, `display1`, `display2`, and `displayDate`.
6. For scripted menus (`type: 'scripted'`), provide a `script` function that dynamically generates child items. Use `Now.include()` to keep scripts in separate files.
