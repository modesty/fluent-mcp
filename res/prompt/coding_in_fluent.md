# Coding in ServiceNow Fluent

Guide for coding in ServiceNow Fluent with metadata type examples.

## Arguments

- `metadata_types`: List of metadata types to include in guide. (Required)

## Content

Fluent (ServiceNow SDK) is a TypeScript-based domain-specific language that allows you to create and manage metadata, modules, records, and tests in the ServiceNow platform. It features:

- Strong typing with TypeScript
- Declarative syntax for better readability
- Integration with modern development tools
- Testability and portability

## Key Concepts

- **Metadata Types**: Each ServiceNow object type (tables, business rules, client scripts, etc.) has a corresponding Fluent API
- **Fluent API**: Uses method chaining for a readable, declarative style
- **TypeScript Support**: Full type checking and editor completion
- **SDK Commands**: CLI tools for initializing, building, and deploying ServiceNow applications

## Syntax and Best Practices

1. **Use Fluent Syntax**
    - Fluent syntax is TypeScript WITHOUT imperative coding constructs such as loops, if-else statements, promises, nor '+' operator for string  concatenation.
    - ALWAYS use template literals for string interpolation and concatenation. Incorrect Example: {conditions: 'priority=3^assignment_group=' + get_sys_id('sys_user_group', 'name=CAB Approval^ORlabel=CAB Approval')} ; Correct Example: {conditions: `priority=3^assignment_group=${get_sys_id('sys_user_group', 'name=CAB Approval^ORlabel=CAB Approval')}`}
    - Write TypeScript code with direct assignments for property values, avoiding any function calls EXCEPT get_sys_id and declared return variables
    - Do NOT put get_sys_id in the import statement, they are helper functions that are already available in the generated code
    - Always import from '@servicenow/sdk/core' for all Fluent (ServiceNow SDK) APIs
2. **Utilize tools**: Utilize the the tools to get metadata API spec, snippets, and instructs to help you write better Fluent (ServiceNow SDK)
   - tools also include now-sdk CLI commands for init a project, build, and deploy
   - when working with a Fluent project locally, ensure to start the conversation with the `working directory` set to the root of the Fluent project
3. **Modularize Code**: Split complex configurations into smaller, reusable modules
   - for `script` properties, create separate `/src/fluent/server/*.js` files and import them
   - to create `/src/fluent/server/*.js` file, use ServiceNow Scripting API to create JavaScript file, *not* TypeScript
4. **Validate Early**: Test your code locally before deploying to instances
5. **Use SDK Commands**: Utilize the ServiceNow SDK CLI for efficient workflows
6. **ServiceNow Glide Script**: ServiceNow scripting are usually used in `script` properties in Fluent APIs, write them inline in ServiceNow Scripting in ES5 syntax, not TypeScript

## Working with Specific Metadata Types

Fluent provides specialized APIs for each ServiceNow metadata type, with methods tailored to their specific attributes and behaviors.

You are currently interested in working with the following metadata types:

- ACL: The [Access Control List API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/acl-api-now-ts.html) defines access control lists [sys_security_acl] that secure parts of an application.
- App Menu: The [Application Menu API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/app-menu-api-now-ts.html) defines menus in the application navigator [sys_app_application].
- ATF: The [Automated Test Framework Test API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/atf-test-now-ts.html) defines automated tests [sys_atf_test] that you can run to confirm that your instance works after making a change.
- Business Rule: The [Business Rule API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/business-rule-api-now-ts.html) defines server-sides scripts [sys_script] that run when a record is displayed, inserted, updated, or deleted, or when a table is queried.
- Client Script: The [Client Script API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/client-script-api-now-ts.html) defines client-side scripts [sys_script_client] that run JavaScript on the client (web browser) when client-based events occur, such as when a form loads, after form submission, or when a field changes value.
- Cross-Scope Privilege: The [Cross-Scope Privilege API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/cs-privileges-api-now-ts.html) defines cross-scope privileges [sys_scope_privilege] for runtime access tracking and application runtime policy.
- List: The [List API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/list-api-now-ts.html) defines list views [sys_ui_list] that display records from a table with customizable columns and ordering.
- Property: The [Property API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/property-api-now-ts.html) defines system properties [sys_properties] that that control instance behavior.
- Record: The [Record AP](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/record-api-now-ts.html) defines records in any table. Use the Record API to define application metadata that doesn't have a dedicated ServiceNow Fluent API..
- Role: The [Role API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/role-api-now-ts.html) defines roles [sys_user_role] that grant specific permissions to users of an application..
- Scheduled Script: The [Scheduled Script Execution API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/scheduled-script-api-now-ts.html) defines scheduled jobs [sysauto_script] that execute server-side scripts at specified times or intervals.
- Script Action (*new in v4*): The [Script Action API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/fluent-script-action-api.html) defines script actions [sysevent_script_action] that run when an event occurs.
- Script Include (*new in v4*): The [Script Include API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/fluent-script-include-api.html) defines script includes [sys_script_include] that store JavaScript functions and classes for use by server-side scripts.
- Scripted REST: The [Scripted REST API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/scripted-rest-api-api-now-ts.html) defines custom REST endpoints [sys_ws_operation], query parameters, and headers for a scripted REST service [sys_ws_definition].
- Service Portal (*new in v4*): The [Service Portal API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/fluent-service-portal-api.html) defines custom widgets [sp_widget] for portal pages, including:
  - [SpWidget](https://www.servicenow.com/docs/bundle/zurich-application-development/page/build/servicenow-sdk/reference/fluent-service-portal-api.html#title_fluent-sp-widget-object) : define a custom widget [sp_widget] to include on a portal page.
  - [SPWidgetDependency](https://www.servicenow.com/docs/bundle/zurich-application-development/page/build/servicenow-sdk/reference/fluent-service-portal-api.html#title_fluent-sp-widget-dependency-object): a widget dependency [sp_dependency] to link JavaScript and CSS files to widgets and use third-party libraries, external style sheets, or Angular modules.
  - [SpAngularProvider](https://www.servicenow.com/docs/bundle/zurich-application-development/page/build/servicenow-sdk/reference/fluent-service-portal-api.html#title_fluent-sp-angular-provider-object): an Angular Provider [sp_angular_provider] to reuse components in multiple widgets and improve portal performance.
- Table: The [Table API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/table-api-now-ts.html) defines tables [sys_db_object] that store data and define database schema with columns and relationships.
- UI Action (*new in v4*): The [UI Action API](https://www.servicenow.com/docs/bundle/xanadu-application-development/page/build/servicenow-sdk/reference/fluent-ui-action-api.html) defines buttons, links, and context menu items [sys_ui_action] that appear on forms and lists.
- UI Page (*new in v4*): The [UI Page API](https://www.servicenow.com/docs/bundle/zurich-application-development/page/build/servicenow-sdk/reference/fluent-ui-page-api.html) defines custom user interface pages [sys_ui_page] that display forms, dialogs, lists, and other UI components.
