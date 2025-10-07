# Instructions for Fluent UI Page API

Always reference the UI Page API specifications for more details.

## Import Statement

1. **Always import UiPage**: Use `import { UiPage } from '@servicenow/sdk/core'` - the dedicated `UiPage` construct provides better type safety than the generic `Record` API.

## Naming Conventions

1. **endpoint format**: Every `endpoint` must end with `.do` and should follow the format `<scope_name>_<page_name>.do`.
1. **Unique identifiers**: Use descriptive `$id` values with `Now.ID['unique_identifier']` to avoid conflicts.
1. **Scoped naming**: Prefix page names with your application scope (e.g., `x_myapp_dashboard.do`).

## Page Types

1. **Standard UI Pages**: Default pages load with ServiceNow navigation and header (set `direct: false` or omit).
1. **Direct UI Pages**: Set `direct: true` to create standalone pages without ServiceNow chrome - useful for:
   - Custom landing pages
   - External-facing interfaces
   - Embedded iframes
   - Login pages or portals
1. **Category selection**: Choose appropriate category for organization:
   - `general` - Most custom pages (default)
   - `homepages` - Dashboard and landing pages
   - `htmleditor` - Rich text editing interfaces
   - `kb` - Knowledge base related pages
   - `cms` - Content management pages
   - `catalog` - Service catalog related pages

## HTML Content

1. **Static HTML**: Use the `html` property for simple static content with standard HTML/XHTML markup.
1. **Jelly templates**: Use Jelly tags (`<j:jelly>`, `<g:evaluate>`) for server-side dynamic content generation.
1. **UI Macros**: Reference UI Macros (e.g., `<g2:ui_reference>`) to use reusable ServiceNow components.
1. **Proper XML declaration**: When using Jelly, start with `<?xml version="1.0" encoding="utf-8" ?>`.
1. **Namespace declarations**: Include required namespaces in Jelly root: `xmlns:j="jelly:core" xmlns:g="glide"`.

## Client-Side Scripting

1. **clientScript property**: Use for JavaScript that runs in the browser after page load.
1. **DOM manipulation**: Access DOM elements using standard JavaScript or jQuery.
1. **Event handlers**: Define functions in `clientScript` that can be called from HTML `onclick`, `onchange`, etc.
1. **GlideAjax calls**: Use `GlideAjax` to communicate with server-side Script Includes.
1. **Client-callable**: Ensure Script Includes used with GlideAjax are marked as client-callable.
1. **AngularJS support**: UI Pages support AngularJS for dynamic, reactive interfaces.
1. **jQuery availability**: jQuery is available by default in ServiceNow - use `$` or `jQuery`.

## Server-Side Scripting

1. **processingScript property**: Use for server-side code that executes on form submission or POST requests.
1. **Form parameters**: Access submitted form data using `g_request.getParameter('param_name')`.
1. **Database operations**: Use `GlideRecord` for CRUD operations in processing script.
1. **User feedback**: Use `gs.addInfoMessage()`, `gs.addErrorMessage()` to provide user feedback after processing.
1. **Jelly evaluation**: Use `<g:evaluate>` tags for server-side logic within HTML content.
1. **Function syntax**: processingScript can be a string or function - strings are more common for UI Pages.

## Security Best Practices

1. **Input validation**: Always validate and sanitize user input in both client and server scripts.
1. **XSS prevention**: Escape user-provided content before displaying in HTML.
1. **Role-based access**: Control access to UI Pages through ACLs (Access Control Lists).
1. **CSRF protection**: ServiceNow provides automatic CSRF tokens for form submissions.
1. **Direct page security**: Direct pages bypass standard security - implement custom authentication if needed.
1. **Script injection**: Never use `eval()` or directly execute user-provided code.

## Performance Optimization

1. **Minimize Jelly processing**: Excessive Jelly evaluation can slow page rendering - keep logic simple.
1. **Client-side rendering**: Move complex logic to client-side when possible to reduce server load.
1. **Lazy loading**: Load data asynchronously with AJAX instead of rendering everything on page load.
1. **Caching**: Consider caching frequently accessed data in client-side or using ServiceNow cache APIs.
1. **Query optimization**: Use GlideAggregate and indexed fields for efficient database queries.
1. **Image optimization**: Optimize images and use ServiceNow's built-in image handling.

## Common Use Cases

1. **Custom dashboards**: Use category `homepages` and combine Jelly with charts for dashboards.
1. **Forms**: Create custom forms with HTML form elements and processingScript for submissions.
1. **Reports**: Display custom reports with dynamic data from Jelly evaluation.
1. **Integration pages**: Direct pages work well for external system integrations.
1. **Knowledge base**: Use category `kb` for custom article viewers or search interfaces.
1. **Wizard interfaces**: Multi-step processes using client-side state management.

## Jelly Template Guidelines

1. **Variable scope**: Variables created with `<g:evaluate var="jvar_name">` are available in Jelly context.
1. **Server-side execution**: Jelly code executes on the server before being sent to client.
1. **JSON data passing**: Use `JSON.stringify()` in Jelly to pass data to client-side JavaScript.
1. **Conditional rendering**: Use `<j:if>` and `<j:choose>` for conditional content.
1. **Loops**: Use `<j:forEach>` or `<j:while>` for iterating over collections.
1. **Error handling**: Jelly errors can break the entire page - test thoroughly.

## AngularJS Integration

1. **Bootstrap directive**: Use `ng-app` directive to bootstrap AngularJS on your page.
1. **Controllers**: Define controllers in `clientScript` property.
1. **Two-way binding**: Leverage `ng-model` for reactive forms and data binding.
1. **Directives**: Use built-in AngularJS directives (`ng-repeat`, `ng-if`, `ng-click`, etc.).
1. **Service integration**: Create or inject AngularJS services for shared functionality.
1. **Version compatibility**: ServiceNow includes specific AngularJS version - check compatibility.

## URL Parameters and Navigation

1. **Query parameters**: Access URL parameters with `g_request.getParameter('param')` in Jelly.
1. **Client access**: Use JavaScript `URLSearchParams` or parse `window.location.search` for client-side access.
1. **Navigation**: Use `window.location.href = 'page.do'` for client-side navigation.
1. **Breadcrumbs**: Standard pages show in navigation history; direct pages don't.
1. **Deep linking**: Support direct links to specific content by handling URL parameters.

## GlideAjax Best Practices

1. **Script Include setup**: Create client-callable Script Include with functions returning string values.
1. **Parameter passing**: Use `ga.addParam('sysparm_name', 'functionName')` to specify the function to call.
1. **Additional params**: Pass data with `ga.addParam('param_name', 'value')`.
1. **Callback handling**: Use `ga.getXMLAnswer(callback)` for asynchronous response handling.
1. **Error handling**: Always handle errors in callback - check if answer is valid.
1. **JSON responses**: Parse JSON responses with `JSON.parse(answer)` in callback.

## Testing and Debugging

1. **Browser console**: Use browser developer tools to debug client-side scripts.
1. **Script debugger**: Use `gs.log()` in server scripts and check system logs.
1. **Jelly debugging**: Jelly errors appear in system logs - check for XML syntax issues.
1. **Incremental testing**: Test HTML, then add Jelly, then add scripts incrementally.
1. **Cross-browser**: Test UI Pages in different browsers for compatibility.
1. **Mobile testing**: Test responsiveness if page will be accessed from mobile devices.

## Common Pitfalls

1. **Missing .do extension**: Always include `.do` in endpoint - pages won't load without it.
1. **XML syntax errors**: Invalid XML in Jelly templates will break the page - validate carefully.
1. **Namespace conflicts**: Declare all required Jelly namespaces or tags won't work.
1. **Script scope issues**: Client script variables are global - avoid naming conflicts.
1. **Direct page authentication**: Direct pages bypass login - implement security checks if needed.
1. **Form submission without processing**: Set `method="POST"` on forms and provide processingScript.
1. **Missing Script Include**: GlideAjax calls fail silently if Script Include doesn't exist or isn't client-callable.
1. **Jelly variable naming**: Always prefix Jelly variables with `jvar_` to avoid conflicts.
1. **Client/server confusion**: Remember Jelly runs server-side before clientScript runs.

## Maintenance Considerations

1. **Documentation**: Add comprehensive `description` to explain page purpose and usage.
1. **Code comments**: Comment complex logic in both client and server scripts.
1. **Version control**: UI Pages are code - use source control best practices.
1. **Update management**: Consider impact on users when updating frequently accessed pages.
1. **Deprecation path**: If replacing a UI Page, provide redirect or migration notice.
1. **Dependencies**: Document any external libraries, Script Includes, or UI Macros used.

## Advanced Techniques

1. **Custom CSS**: Include `<style>` tags in HTML or link external stylesheets.
1. **Third-party libraries**: Include external JavaScript libraries (Chart.js, D3.js, etc.) with `<script>` tags.
1. **WebSockets**: Use WebSockets for real-time updates (requires additional setup).
1. **REST integration**: Call REST APIs from client-side using fetch or XMLHttpRequest.
1. **File uploads**: Implement file upload functionality with proper encoding and processing.
1. **Print styling**: Add print-specific CSS with `@media print` queries.

## Accessibility

1. **Semantic HTML**: Use proper HTML5 semantic elements (`<header>`, `<nav>`, `<main>`, etc.).
1. **ARIA labels**: Add ARIA attributes for screen reader support.
1. **Keyboard navigation**: Ensure all interactive elements are keyboard accessible.
1. **Color contrast**: Maintain sufficient color contrast for readability.
1. **Alt text**: Provide alt text for images and meaningful labels for form fields.
1. **Focus management**: Manage focus appropriately for modal dialogs and dynamic content.

## Migration from Classic UI

1. **UI16 compatibility**: Test UI Pages in UI16/Next Experience for styling compatibility.
1. **Responsive design**: Use Bootstrap classes (available in ServiceNow) for responsive layouts.
1. **Workspace compatibility**: Direct pages work better for custom workspace interfaces.
1. **Form alternatives**: Consider using UI Builder for modern form experiences when appropriate.
