# **Context**: Service Portal API spec: defines custom widgets, widget dependencies, and Angular providers for Service Portal pages

## SpWidget API

Creates a custom widget (`sp_widget`) to include on a portal page. Widgets are reusable UI components that display data and provide interactivity in Service Portal.

```typescript
// Creates a new Service Portal Widget (sp_widget)
SpWidget({
    $id: '', // string | guid, mandatory
    name: '', // string, mandatory, name of the widget
    description: '', // string, optional, description of the widget's functionality
    htmlTemplate: '', // string, optional, HTML template for the widget's client-side view
    cssTemplate: '', // string, optional, CSS styling for the widget
    clientScript: '', // string, optional, client-side controller script (AngularJS controller function)
    serverScript: '', // string, optional, server-side script that runs before the widget is rendered
    controllerAs: '', // string, optional, alias for the controller in the template (default: 'c')
    demoData: '', // string, optional, JSON data used for widget preview/demo in Service Portal Designer
    optionSchema: '', // string, optional, JSON schema defining configurable options for the widget
    dataTable: '', // string, optional, primary table the widget interacts with
    scriptIncludes: [], // string[], optional, array of script include sys_ids or names to be used in server script
    sassSrc: '', // string, optional, SASS source for advanced styling with variables and nesting
    linkFunction: '', // string, optional, AngularJS link function for direct DOM manipulation
    controllable: false, // boolean, optional, whether the widget can be controlled by other widgets via events, default false
    hasPreview: false, // boolean, optional, whether the widget has a preview template, default false
    servicenowNative: false, // boolean, optional, indicates if this is a ServiceNow native widget, default false
    internal: false, // boolean, optional, whether the widget is for internal use only, default false
    public: false, // boolean, optional, whether the widget is available for public access, default false
    roles: '', // string, optional, comma-separated list of roles required to view the widget
    category: '', // string, optional, widget category for organization in Service Portal Designer
    field_list: '', // string, optional, comma-separated list of fields from dataTable to be available in the widget
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
    jsIncludes: '', // string, optional, JavaScript code or URLs to include (multiple URLs separated by newlines)
    cssIncludes: '', // string, optional, CSS code or URLs to include (multiple URLs separated by newlines)
    source: '', // string, optional, source URL of the dependency (e.g., CDN URL)
    version: '', // string, optional, version of the library/dependency for tracking
    order: 100, // number, optional, load order for the dependency (lower numbers load first), default 100
})
```

## SpAngularProvider API

Creates an Angular Provider (`sp_angular_provider`) to reuse components in multiple widgets and improve portal performance by centralizing common functionality.

```typescript
// Creates a new Service Portal Angular Provider (sp_angular_provider)
SpAngularProvider({
    $id: '', // string | guid, mandatory
    name: '', // string, mandatory, name of the Angular provider (used to inject into widgets)
    type: '', // string, mandatory, type of Angular provider: 'service'|'factory'|'directive'|'filter'|'value'|'constant'|'provider'
    script: '', // string, mandatory, JavaScript code defining the Angular provider implementation
    restricted: false, // boolean, optional, whether access to the provider is restricted by roles, default false
    roles: '', // string, optional, comma-separated list of roles required to use the provider (only applies when restricted=true)
})
