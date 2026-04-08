# Instructions for Fluent Service Portal APIs

Always reference the Service Portal API specifications for more details.

## SpWidget API

1. **Templates and Controllers**:
   - Use AngularJS data binding: `{{c.data.property}}` (controller accessible as `c` by default)
   - Override controller alias with `controllerAs` property if needed
   - Use `cssTemplate` for simple styles, `sassSrc` for complex SCSS with variables

2. **Scripts**:
   - **Client script**: AngularJS controller function. Use `c.server.get()` or `c.server.update()` to communicate with server
   - **Server script**: Runs before rendering. Access `input`, store data in `data`, use `options` for widget configuration
   - **Link function**: Only for direct DOM manipulation. Avoid unless necessary

3. **Configuration**:
   - Define `optionSchema` as JSON array for configurable widgets: `{name, label, type, default_value}`
   - Use `field_list` to specify which fields from `dataTable` are available
   - Set `controllable: true` to allow widget communication via events (`$scope.$on()`)

4. **Security**:
   - Set `roles` property to restrict visibility
   - Use `public: true` for unauthenticated access
   - Always check `gs.hasRole()` in server script for sensitive operations

5. **Dependencies**:
   - Use `scriptIncludes` array for server-side script includes
   - Create SPWidgetDependency records for client-side libraries

## SPWidgetDependency API

1. **Loading**:
   - Use `order` to control load sequence (lower numbers load first, default: 100)
   - Separate multiple URLs with newlines in `jsIncludes` or `cssIncludes`

2. **Angular Modules**:
   - Set `angularModuleName` when including Angular modules
   - Module name must match the actual Angular module name

3. **Inline Code**:
   - Include inline JavaScript or CSS directly for small utilities
   - Use `version` property to track external library versions

## SpAngularProvider API

1. **Provider Types** (lowercase):
   - **service**: Business logic, instantiated as singleton with `new`
   - **factory**: Returns object/function, more flexible than service
   - **directive**: Reusable UI components. Use `restrict: 'E'` for elements, `'A'` for attributes
   - **filter**: Data transformation in templates. Keep pure functions
   - **constant**: Immutable configuration values
   - **value**: Simple values that can be overridden
   - **provider**: Advanced configuration with `$get` method

2. **Best Practices**:
   - Inject dependencies as function parameters: `$http`, `$q`, `$timeout`, `$sce`
   - Set `restricted: true` and specify `roles` for role-based access
   - Name services/factories in PascalCase, directives/filters in camelCase

3. **Common Issues**:
   - Avoid heavy computations in filters (run on every digest cycle)
   - Don't manipulate DOM in services/factories - use directives
   - Always handle promise rejections with error callbacks

## SPPage API (SDK v4.5.0)

1. Import `SPPage` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique.
2. The `title` field is mandatory and serves as the display name for the page.
3. Set `public: true` to make a page accessible without authentication. Use `roles` to restrict access to specific roles.
4. Pages serve as containers for widget instances — configure the page layout and add widgets separately.

## SPTheme API (SDK v4.5.0)

1. Import `SPTheme` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique.
2. The `name` field is mandatory. Use descriptive names that reflect the visual identity (e.g., "Corporate Dark Theme").
3. Define `cssVariables` as CSS custom properties to control colors, fonts, and spacing across the portal.
4. Use `header` and `footer` to reference widget instances that serve as the theme's header and footer.

## SPMenu API (SDK v4.5.0)

1. Import `SPMenu` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique.
2. The `title` field is mandatory. Define navigation items in the `items` array with labels, URLs, and optional sub-items.
3. Use `roles` to restrict menu visibility to specific user roles.
