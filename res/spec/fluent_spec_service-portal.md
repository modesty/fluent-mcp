# **Context**: Service Portal API spec: defines custom widgets, pages, themes, menus, widget dependencies, and Angular providers for Service Portal

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
    customCss: '', // string, optional, custom CSS styling for the widget
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
    fields: [], // string[], optional, array of field names from dataTable to be available in the widget
    hasPreview: false, // boolean, optional, show the preview pane in Service Portal editor, default false
    servicenow: false, // boolean, optional, built by ServiceNow (only true if scope has sn_ or snc_ prefix), default false
    internal: false, // boolean, optional, internal field used by ServiceNow developers, default false
    public: false, // boolean, optional, whether the widget is available for public access, default false
    roles: [], // (string | Role | Record<'sys_user_role'>)[], optional, roles that can access the widget
    category: '', // string, optional, widget category: 'standard'|'otherApplications'|'custom'|'sample'|'knowledgeBase'|'servicePortal'|'serviceCatalog' (default: 'custom')
    docs: '', // string | Record<'sp_documentation'>, optional, documentation for the widget
    dependencies: [], // (string | Record<'sp_dependency'> | SPWidgetDependency)[], optional, array of widget dependencies
    angularProviders: [], // (string | Record<'sp_angular_provider'> | SPAngularProvider)[], optional, array of Angular providers for the widget
    templates: [], // SPTemplate[], optional, array of widget templates: [{$id, id, htmlTemplate}]
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
    css: '', // string, optional, page-scoped CSS applied only when this page is rendered
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
      // SPContainer: { $id?, name?, width? ('container'|'container-fluid'), backgroundStyle? ('default'|'contain'|'repeat'|'cover'), backgroundColor?, backgroundImage?, cssClass?, parentClass?, subheader?, bootstrapAlt?, semanticTag? ('main'), title?, order?, rows? }
      // SPRow: { $id?, cssClass?, semanticTag? ('main'), order?, columns? }
      // SPColumn: { $id?, size? (1-12), sizeSm?, sizeLg?, sizeXs?, cssClass?, semanticTag? ('main'), order?, instances?, nestedRows? }
      // SPInstance: { $id?, title?, id?, widget?, widgetParameters?, css?, url?, glyph?, size? ('sm'|'md'|'lg'|'xl'), color? ('default'|'primary'|'success'|'info'|'warning'|'danger'), cssClass?, active?, order?, roles?, shortDescription?, column?, asyncLoad?, asyncLoadTrigger? ('viewport'|'parallel'), asyncLoadDeviceType?, preservePlaceholderSize?, advancedPlaceholderDimensions?, placeholderDimensions?, placeholderConfigurationScript?, placeholderTemplate? }
})
```

## SPTheme API (SDK v4.5.0)

Creates a Service Portal Theme (`sp_theme`) that defines the visual appearance of a portal including colors, fonts, header/footer, and resource includes.

```typescript
// Creates a new Service Portal Theme (sp_theme)
SPTheme({
    $id: '', // string | guid, mandatory
    name: '', // string, mandatory, display name of the theme
    customCss: '', // string, optional, SCSS variable definitions applied globally (maps to sp_theme.css_variables), e.g. '$nav-color: #333; $brand-primary: #0070d2;'
    header: '', // string | Record<'sp_header_footer'>, optional, header widget rendered at the top of every page
    footer: '', // string | Record<'sp_header_footer'>, optional, footer widget rendered at the bottom of every page
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
      //   $id?, label (required), type? ('page'|'url'|'sc_category'|'sc_cat_item'|'kb_topic'|'kb_article'|'kb_category'|'filtered'|'scripted', default: 'page'),
      //   order? (default: 100), active?, roles?, glyph?, color? (BootstrapColor), hint?, shortDescription?, condition?,
      //   page? (for type 'page'|'sc_category'|'sc_cat_item'|'kb_topic'|'kb_article'|'kb_category'),
      //   url? (for type 'url'), urlTarget? (for type 'url'),
      //   scCategory? (for type 'sc_category'), catItem? (for type 'sc_cat_item'),
      //   kbTopic? (for type 'kb_topic', values: 'Policies'|'Applications'|'General'|'FAQ'|'Desktop'|'News'|'Email'),
      //   kbArticle? (for type 'kb_article'), kbCategory? (for type 'kb_category'),
      //   table?, filter?, display1?, display2?, displayDate? (for type 'filtered'),
      //   script? (for type 'scripted'),
      //   childItems?: LeafMenuItem[] (same shape without childItems)
      // }
    roles: [], // (string | Role | Record<'sys_user_role'>)[], optional (inherited from SPInstance)
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
})
