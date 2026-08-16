# **Context**: Service Portal API spec: defines portals, custom widgets, pages, themes, menus, widget dependencies, and Angular providers for Service Portal

## ServicePortal API

Creates the portal itself (`sp_portal`) -- the top-level container that ties pages, themes, menus, knowledge bases, and catalogs into one branded self-service experience (AngularJS + Bootstrap 3). Every other Service Portal API hangs off a portal.

```typescript
// Creates a new Service Portal (sp_portal)
ServicePortal({
    $id: '', // string | number | ExplicitKey<string>, mandatory
    title: '', // string, mandatory, portal display name shown in the browser tab and portal header
    urlSuffix: '', // string, mandatory, URL path suffix the portal is served at, e.g. 'esc' -> /<instance>/esc
      // Must be lowercase; may contain hyphens and underscores (hyphens accepted by the build validator as of SDK v4.10.1); cannot start/end with an underscore
      // MUST be unique across the instance -- query sp_portal with url_suffix=<value> before creating

    // Branding
    logo: '', // string, optional, header logo: user_image sys_id or a Now.attach() reference
      // REQUIRED practice: if no logo asset exists, generate a fallback (e.g. an SVG with the portal initials) and set it.
      // The OOTB header silently degrades to plain text via ng-if="::!portal.logo" -- no build error, no visual cue.
    logoAltText: '', // string, optional, accessible alt text for the logo image (screen readers)
    icon: '', // string, optional, browser favicon: sys_id of a user_image attachment
    hidePortalName: false, // boolean, optional, hides the portal title text in the header nav bar (default: false)
    cssVariables: '', // string, optional, JSON string of portal-level CSS custom properties that override theme variables, e.g. '{"--color-primary":"#0070d2"}'
    theme: '', // string | Record<'sp_theme'> | SPTheme, optional, light-mode theme applied to all pages in the portal
    darkTheme: '', // string | Record<'sp_theme'> | SPTheme, optional, theme applied when the user selects dark mode

    // Navigation and pages (pass an imported SPPage/SPMenu object for records you own, a 32-char sys_id for OOTB records)
    mainMenu: '', // string | Record<'sp_instance_menu'> | SPMenu, optional, navigation menu rendered in the portal header
      // Only renders when the portal's theme also sets `header` -- theme + theme.header + mainMenu must all be present
    homePage: '', // string | Record<'sp_page'> | SPPage, optional, default landing page for the portal root URL
      // A page `id` string (e.g. 'my-home') is NOT valid here -- it silently falls back to the OOTB home page
    loginPage: '', // string | Record<'sp_page'> | SPPage, optional, page shown to unauthenticated users instead of the requested page
    notFoundPage: '', // string | Record<'sp_page'> | SPPage, optional, page rendered when a route cannot be matched (HTTP 404 equivalent)
    catalogHomePage: '', // string | Record<'sp_page'> | SPPage, optional, Service Catalog home/landing page
    categoryHomePage: '', // string | Record<'sp_page'> | SPPage, optional, page used when browsing Service Catalog categories (sc_category)
    knowledgeHomePage: '', // string | Record<'sp_page'>, optional, Knowledge Management home/landing page (no SPPage form in this union)

    // ITSM / content integration -- these select which OOTB pages and data sources the portal uses; they are NOT SPPageRouteMap redirects
    catalogs: [], // { catalog: string | Record<'sc_catalog'>, order?: number, active?: boolean }[], optional, ordered service catalogs available in the portal (default: [])
      // Mutually exclusive with the deprecated singular `catalog?: string | Record<'sc_catalog'>` -- use `catalogs`
    knowledgeBases: [], // { knowledgeBase: string | Record<'kb_knowledge_base'>, order?: number, active?: boolean }[], optional, ordered knowledge bases available in the portal (default: [])
      // Mutually exclusive with the deprecated singular `knowledgeBase?: string | Record<'kb_knowledge_base'>` -- use `knowledgeBases`
    taxonomies: [], // { taxonomy: string | Record<'taxonomy'>, order?: number, active?: boolean }[], optional, ordered taxonomy entries for navigation/content classification (default: [])
    chatQueue: '', // string | Record<'chat_queue'>, optional, chat queue used for Virtual Agent / live chat integration (adds a chat launcher to the header)
    communicationChannels: [], // string[], optional, sys_ids of communication channel records used for Virtual Agent or ITSM chat

    // Search
    searchSources: [], // { searchSource: string | Record<'sp_search_source'>, order?: number }[], optional, ordered search sources; `order` positions each group in the results (default: [])
    searchApplication: '', // string | Record<'sys_search_application'>, optional, defines which content sources (tables, KB, catalog) portal search covers
    searchResultsConfiguration: '', // string | Record<'sys_ux_composite_definition'>, optional, Unified Search composite definition controlling result rendering
    textIndexGroup: '', // string | Record<'ts_index_group'>, optional, full-text search index group scoping what text is indexed and searched
    enableAiSearch: false, // boolean, optional, enables the AI-powered search experience (Unified Search / NLU); requires searchApplication + searchResultsConfiguration (default: false)

    // Behavior flags
    defaultPortal: false, // boolean, optional, makes this the portal used when navigating via /?id=<pageId> without a suffix; at most one portal per instance (default: false)
    enableFavorites: false, // boolean, optional, enables the Quick Start / Favorites panel for pinning catalog items, articles, and pages (default: false)
    quickStartConfig: '', // string, optional, JSON string styling the Quick Start / Favorites icons, e.g. '[{"favorite":{"icon_checked":"fa-heart","icon_unchecked":"fa-heart-o","color":"primary"}}]'
    enableWebEmbeddables: false, // boolean, optional, allows Next Experience web components (macroponents) inside portal widgets and pages (default: false)
    embeddableMacroponents: [], // string[], optional, sys_ids of sys_ux_macroponent records that may be embedded in this portal
    enableCertificateBasedAuthentication: false, // boolean, optional, requires a valid client certificate for portal access (default: false)
    supportRightToLeftLanguages: false, // boolean, optional, mirrors the layout for RTL languages such as Arabic and Hebrew (default: false)
    inactive: false, // boolean, optional, deactivates the portal; users are redirected to alternatePortal when set (default: false)
    alternatePortal: '', // string | Record<'sp_portal'>, optional, portal to redirect to while this one is inactive (only applies when inactive is true)

    protectionPolicy: '', // 'read' | 'protected', optional, post-install access control for other developers: 'read' = view but not change; 'protected' = cannot change; omit to allow customization
    $override: {}, // Record<string, string | boolean | number>, optional, escape hatch to set unmodeled sp_portal columns by DB column name
    $meta: {}, // object, optional: { installMethod?: 'first install' | 'demo' | 'once', useEsLatest?: boolean (SDK v4.10.1+) }
})
```

## SPWidget API

Creates a custom widget (`sp_widget`) to include on a portal page. Widgets are reusable UI components that display data and provide interactivity in Service Portal.

```typescript
// Creates a new Service Portal Widget (sp_widget)
SPWidget({
    $id: '', // string | guid, mandatory
    name: '', // string, mandatory, name of the widget
    description: '', // string, optional, description of the widget's functionality
    id: '', // string, optional, unique id for the widget (must contain alphanumeric, -, or _ characters)
    htmlTemplate: '', // string, optional, HTML template for the widget's client-side view
    customCss: '', // string, optional, custom SCSS or CSS styling for the widget (SCSS is compiled server-side)
    clientScript: '', // string, optional, client-side controller script (AngularJS controller function)
    serverScript: '', // string, optional, server-side script that runs before the widget is rendered
    linkScript: '', // string, optional, client-side AngularJS link function for direct DOM manipulation
    controllerAs: '', // string, optional, alias for the controller in the template (default: 'c')
    demoData: {}, // JsonSerializable, optional, JSON data used for widget preview/demo in Service Portal Designer
    optionSchema: [], // WidgetOption[], optional, array of option definitions for configurable widgets
      // WidgetOption: { name, label, section ('Data'|'Behavior'|'Documentation'|'Presentation'|'other'), type ('string'|'boolean'|'integer'|'reference'|'choice'|'field_list'|'field_name'|'glide_list'|'glyphicon'), defaultValue?, hint? }
      // ChoiceWidgetOption adds: choices: [{label, value}]
      // FieldListWidgetOption adds: table: string
      // GlideListWidgetOption adds: displayValueList?, ed?: {reference: string}, value?, displayValue?
    dataTable: '', // TableName, optional, primary table the widget interacts with (default: 'sp_instance')
    fields: [], // (keyof FullSchema<dataTable> | SystemColumns | (string & {}))[], optional, field names from dataTable made available to the widget
      // Typed against the dataTable schema (plus system columns); arbitrary strings still compile for fields the schema does not model.
      // Maps to sp_widget.field_list and drives the field picker in the Service Portal designer.
    hasPreview: false, // boolean, optional, show the preview pane in Service Portal editor, default false
    servicenow: false, // boolean, optional, built by ServiceNow (only true if scope has sn_ or snc_ prefix), default false
    internal: false, // boolean, optional, internal field used by ServiceNow developers, default false
    public: false, // boolean, optional, whether the widget is available for public access, default false
    roles: [], // (string | Role | Record<'sys_user_role'>)[], optional, roles that can access the widget
    category: '', // string, optional, widget category: 'standard'|'otherApplications'|'custom'|'sample'|'knowledgeBase'|'servicePortal'|'serviceCatalog' (default: 'custom')
    docs: '', // string | Record<'sp_documentation'>, optional, documentation for the widget
    dependencies: [], // (string | Record<'sp_dependency'> | SPWidgetDependency)[], optional, array of widget dependencies
    angularProviders: [], // (string | Record<'sp_angular_provider'> | SPAngularProvider)[], optional, array of Angular providers for the widget
    templates: [], // SPTemplate[], optional, additional Angular templates (maps to sp_ng_template): [{ $id (mandatory), id (mandatory), htmlTemplate (mandatory) }]
      // There is no separate SPNgTemplate() API -- sp_ng_template records are authored here, on the owning widget.
    protectionPolicy: '', // 'read' | 'protected', optional, post-install access control for other developers: 'read' = view but not change; 'protected' = cannot change; omit to allow customization
    $override: {}, // Record<string, string | boolean | number>, optional, escape hatch to set unmodeled sp_widget columns by DB column name
    $meta: {}, // object, optional: { installMethod?: 'first install' | 'demo' | 'once', useEsLatest?: boolean (SDK v4.10.1+) }
      // useEsLatest: run this record's server-side script field(s) with the latest supported ECMAScript version instead of the
      // application's default. Omit to leave the sys_app/now.config default in place. Applies to all fields defined for this entity.
})
```

## SPWidgetDependency API

Creates a widget dependency (`sp_dependency`) to link JavaScript and CSS files to widgets and use third-party libraries, external style sheets, or Angular modules.

```typescript
// Creates a new Service Portal Widget Dependency (sp_dependency)
SPWidgetDependency({
    $id: '', // string | guid, mandatory
    name: '', // string, mandatory, name of the dependency
    angularModuleName: '', // string, optional, name of the Angular module to be injected (for Angular dependencies)
    includeOnPageLoad: false, // boolean, optional, whether the dependency should be included on page load (default: false)
    portalsForPageLoad: [], // (string | Record<'sp_portal'>)[], optional, array of portals for which the dependency is loaded on page load
    jsIncludes: [], // JsIncludeWithOrder[], optional, ordered array of JavaScript includes
      // Each: { order: number, include: string | Record<'sp_js_include'> | JsInclude }
      // JsInclude: { $id, name, url? (cannot use with sysUiScript), sysUiScript?: string | Record<'sys_ui_script'> }
    cssIncludes: [], // CssIncludeWithOrder[], optional, ordered array of CSS includes
      // Each: { order: number, include: string | Record<'sp_css_include'> | CssInclude }
      // CssInclude: { $id, name, url? (cannot use with spCss), spCss?: string | Record<'sp_css'>, rtlCssUrl?, lazyLoad? }
    protectionPolicy: '', // 'read' | 'protected', optional, post-install access control for other developers: 'read' = view but not change; 'protected' = cannot change; omit to allow customization
    $override: {}, // Record<string, string | boolean | number>, optional, escape hatch to set unmodeled sp_dependency columns by DB column name
    $meta: {}, // object, optional: { installMethod?: 'first install' | 'demo' | 'once', useEsLatest?: boolean (SDK v4.10.1+) }
})
```

## SPPage API (SDK v4.5.0)

Creates a Service Portal Page (`sp_page`) that serves as a container for widget instances within a portal. Pages use a hierarchical layout: containers hold rows, rows hold columns, and columns hold widget instances.

```typescript
// Creates a new Service Portal Page (sp_page)
SPPage({
    pageId: '', // string, mandatory, URL-level identifier used in routing (?id=<pageId>), maps to sp_page.id
    title: '', // string, optional, page title displayed in the browser tab
    shortDescription: '', // string, optional, brief admin-visible description of the page's purpose
    category: '', // PageCategory, optional, page category: 'custom'|'standard'|'sample'|'sp_platform'|'kb'|'other'|'sc'|'sn_ex_sp_taxonomy'|'' (default: 'custom')
    css: '', // string, optional, page-scoped SCSS or CSS applied only when this page is rendered
    draft: false, // boolean, optional, draft pages visible only to designers/admins, default false
    internal: false, // boolean, optional, hides page from the page picker in portal designer, default false
    omitWatcher: false, // boolean, optional, disables AngularJS $watch listener for performance, default false
    public: false, // boolean, optional, makes the page accessible to unauthenticated users, default false
    useSeoScript: false, // boolean, optional, enables dynamic <title> and meta tag generation via seoScript, default false
    seoScript: '', // string | ScriptIncludeOptions | Record<'sys_script_include'>, optional, server-side script for dynamic SEO title/description (only used when useSeoScript is true)
    dynamicTitleStructure: '', // string, optional, template string for dynamic page <title> tag, e.g. 'Incident ${number} - ${short_description}'
    humanReadableUrlStructure: '', // string, optional, friendly URL path pattern with {variable} placeholders, must contain exactly one '/' separator, e.g. 'knowledge/{sys_id}'
    roles: [], // (string | Role | Record<'sys_user_role'>)[], optional, restricts access to users with at least one of the specified roles
    containers: [], // SPContainer[], optional, top-level layout sections of the page, each holds rows of columns with widget instances
      // $id is MANDATORY on every nested layout node (SPContainer / SPRow / SPColumn / SPInstance) -- each maps to its own record.
      // SPContainer: { $id (mandatory), name?, width? ('container'|'container-fluid'), backgroundStyle? ('default'|'contain'|'repeat'|'cover'), backgroundColor?, backgroundImage?, cssClass?, parentClass?, subheader?, bootstrapAlt?, semanticTag? ('main'), title?, order?, rows? }
      // SPRow: { $id (mandatory), cssClass?, semanticTag? ('main'), order?, columns? }
      // SPColumn: { $id (mandatory), size? (1|2|3|4|5|6|7|8|9|10|11|12 -- a literal union, not a plain number; default 12), sizeSm?, sizeLg?, sizeXs?, cssClass?, semanticTag? ('main'), order?, instances?, nestedRows? }
      // SPInstance: { $id (mandatory), title?, id?, widget?, widgetParameters?, css?, url?, glyph?, size? ('sm'|'md'|'lg'|'xl'), color? ('default'|'primary'|'success'|'info'|'warning'|'danger'), cssClass?, active?, order?, roles?, shortDescription?, column?, asyncLoad?, asyncLoadTrigger? ('viewport'|'parallel'), asyncLoadDeviceType?, preservePlaceholderSize?, advancedPlaceholderDimensions?, placeholderDimensions?, placeholderConfigurationScript?, placeholderTemplate? }
      //   semanticTag is the single literal 'main' on container/row/column -- there is no 'section' / 'aside' value.
      //   SPInstance.css is SCSS or CSS scoped to that instance, applied in addition to the widget's own customCss.
      //   SPInstance.widgetParameters: JsonSerializable. Prefer the plain object form -- widgetParameters: { param1: 'value1' } --
      //     which the build plugin serializes for you as of SDK v4.10.1 (earlier releases passed the object through unserialized).
      //     A JSON string ('{"param1":"value1"}') and Now.include('./params.json') are also accepted. Keys must match the widget's
      //     optionSchema entry names. Note booleans survive as real booleans from an object but as 'true'/'false' from a JSON
      //     string -- read them defensively in the server script (options.flag !== false && options.flag !== 'false').
      //   Async placeholder controls -- preservePlaceholderSize, placeholderDimensions (JsonSerializable, needs
      //     advancedPlaceholderDimensions: true), placeholderConfigurationScript (server-side script returning dimension config),
      //     placeholderTemplate (AngularJS HTML) -- are honored by the build as of SDK v4.10.1; earlier releases discarded
      //     the supplied values and wrote hardcoded defaults. All are only relevant when asyncLoad is true.
    protectionPolicy: '', // 'read' | 'protected', optional, post-install access control for other developers: 'read' = view but not change; 'protected' = cannot change; omit to allow customization
    $override: {}, // Record<string, string | boolean | number>, optional, escape hatch to set unmodeled sp_page columns by DB column name
    $meta: {}, // object, optional: { installMethod?: 'first install' | 'demo' | 'once', useEsLatest?: boolean (SDK v4.10.1+) }
      // useEsLatest: run this record's server-side script field(s) with the latest supported ECMAScript version instead of the
      // application's default. Omit to leave the sys_app/now.config default in place. Applies to all fields defined for this entity.
})
```

Note: `SPPage` has no `$id` -- `pageId` is its identity. `$id` is mandatory on every other Service Portal API and on all nested layout nodes.

## SPTheme API (SDK v4.5.0)

Creates a Service Portal Theme (`sp_theme`) that defines the visual appearance of a portal including colors, fonts, header/footer, and resource includes.

```typescript
// Creates a new Service Portal Theme (sp_theme)
SPTheme({
    $id: '', // string | guid, mandatory
    name: '', // string, mandatory, display name of the theme
    customCss: '', // string, optional, SCSS variable definitions applied globally (maps to sp_theme.css_variables), e.g. '$nav-color: #333; $brand-primary: #0070d2;'
    header: '', // string | SPHeaderFooter | Record<'sp_header_footer'>, optional, header widget rendered at the top of every page
    footer: '', // string | SPHeaderFooter | Record<'sp_header_footer'>, optional, footer widget rendered at the bottom of every page
    fixedHeader: true, // boolean, optional, keeps the header anchored to the top of the viewport (sticky header), default true
    fixedFooter: true, // boolean, optional, keeps the footer anchored to the bottom of the viewport, default true
    turnOffScssCompilation: false, // boolean, optional, disables server-side SCSS compilation for customCss (use for plain CSS custom properties), default false
    matchingNextExperienceTheme: '', // string | Record<'sys_ux_theme'>, optional, links to a Next Experience theme for consistent branding across portal and workspace UIs
    icon: '', // Image | string, optional, browser favicon / portal icon (user_image sys_id or Now.attach('path/to/icon.png'))
    logo: '', // Image | string, optional, logo image displayed in the portal header (user_image sys_id or Now.attach('path/to/logo.png'))
    logoAltText: '', // string, optional, accessible alt text for the logo image
    cssIncludes: [], // CssIncludeWithOrder[], optional, ordered list of CSS files loaded on every page using this theme
      // Each: { order: number, include: string | Record<'sp_css_include'> | CssInclude }
    jsIncludes: [], // JsIncludeWithOrder[], optional, ordered list of JavaScript files loaded on every page using this theme
      // Each: { order: number, include: string | Record<'sp_js_include'> | JsInclude }
    protectionPolicy: '', // 'read' | 'protected', optional, post-install access control for other developers: 'read' = view but not change; 'protected' = cannot change; omit to allow customization
    $override: {}, // Record<string, string | boolean | number>, optional, escape hatch to set unmodeled sp_theme columns by DB column name
    $meta: {}, // object, optional: { installMethod?: 'first install' | 'demo' | 'once', useEsLatest?: boolean (SDK v4.10.1+) }
})
```

## SPMenu API (SDK v4.5.0)

Creates a Service Portal Menu (`sp_instance_menu`) for navigation within a portal. SPMenu extends SPInstance (widget instance) and adds hierarchical menu items.

```typescript
// Creates a new Service Portal Menu (sp_instance_menu)
// SPMenu extends SPInstance, so it inherits all SPInstance properties (title, id, widget, widgetParameters, css, url, glyph, size, color, cssClass, active, order, roles, shortDescription, column, asyncLoad, etc.)
SPMenu({
    $id: '', // string | guid, mandatory
    title: '', // string, optional (inherited from SPInstance), heading text displayed above the menu
    widget: '', // string | Record<'sp_widget'> | SPWidget, optional (inherited), the widget to render
    items: [], // SPMenuItem[], optional, array of menu item configurations (maps to sp_rectangle_menu_item)
      // SPMenuItem: {
      //   $id (mandatory), label (required),
      //   type? -- 11 values, taken from the sp_rectangle_menu_item.type choice list (default: 'page'):
      //     'page' (Page) | 'url' (URL) | 'sc' (Service Catalog) | 'sc_category' (Catalog Category) | 'sc_cat_item' (Catalog Item)
      //     | 'kb' (Knowledge Base) | 'kb_topic' (KB Topic) | 'kb_article' (KB Article) | 'kb_category' (KB Category)
      //     | 'filtered' (Filtered List) | 'scripted' (Scripted List)
      //   order? (default: 100), active?, roles?, glyph?, color? (BootstrapColor), hint?, shortDescription?, condition?,
      //   page? (for type 'page'|'sc_category'|'sc_cat_item'|'kb_topic'|'kb_article'|'kb_category'; MUST be set for 'page' or the link goes nowhere),
      //   url? (for type 'url'), urlTarget? (for type 'url'),
      //   scCategory? (for type 'sc_category'), catItem? (for type 'sc_cat_item'),
      //   kbTopic? (for type 'kb_topic', values: 'Policies'|'Applications'|'General'|'FAQ'|'Desktop'|'News'|'Email'),
      //   kbArticle? (for type 'kb_article'), kbCategory? (for type 'kb_category'),
      //   table?, filter?, display1?, display2?, displayDate? (for type 'filtered'),
      //   script? (for type 'scripted'),
      //   childItems?: LeafMenuItem[] (same shape, $id mandatory, without childItems)
      // }
    roles: [], // (string | Role | Record<'sys_user_role'>)[], optional (inherited from SPInstance)
    protectionPolicy: '', // 'read' | 'protected', optional, post-install access control for other developers: 'read' = view but not change; 'protected' = cannot change; omit to allow customization
    $override: {}, // Record<string, string | boolean | number>, optional, escape hatch to set unmodeled sp_instance_menu columns by DB column name
    $meta: {}, // object, optional: { installMethod?: 'first install' | 'demo' | 'once', useEsLatest?: boolean (SDK v4.10.1+) }
      // useEsLatest: run this record's server-side script field(s) with the latest supported ECMAScript version instead of the
      // application's default. Omit to leave the sys_app/now.config default in place. Applies to all fields defined for this entity.
})
```

## SPAngularProvider API

Creates an Angular Provider (`sp_angular_provider`) to reuse components in multiple widgets and improve portal performance by centralizing common functionality.

```typescript
// Creates a new Service Portal Angular Provider (sp_angular_provider)
SPAngularProvider({
    $id: '', // string | guid, mandatory
    name: '', // string, mandatory, name of the Angular provider (used to inject into widgets)
    type: '', // AngularProviderType, optional, type of Angular provider: 'directive'|'factory'|'service' (default: 'directive')
    script: '', // string, optional, JavaScript code defining the Angular provider implementation
    requires: [], // (string | Record<'sp_angular_provider'> | SPAngularProvider)[], optional, array of Angular providers required by this provider
    protectionPolicy: '', // 'read' | 'protected', optional, post-install access control for other developers: 'read' = view but not change; 'protected' = cannot change; omit to allow customization
    $override: {}, // Record<string, string | boolean | number>, optional, escape hatch to set unmodeled sp_angular_provider columns by DB column name
    $meta: {}, // object, optional: { installMethod?: 'first install' | 'demo' | 'once', useEsLatest?: boolean (SDK v4.10.1+) }
})
```
