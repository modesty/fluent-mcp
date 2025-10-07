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
