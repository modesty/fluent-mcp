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
    - Write TypeScript code with direct assignments for property values, avoiding any function calls EXCEPT get_sys_id, resolve_table_fields, and declared return variables
    - Do NOT put get_sys_id, resolve_table_fields in the import statement, they are helper functions that are already available in the generated code
    - Always import from '@servicenow/sdk/core' for all Fluent (ServiceNow SDK) APIs
2. **Utilize tools**: Utilize the the tools to get metadata API spec, snippets, and instructs to help you write better Fluent (ServiceNow SDK)
   - tools also include now-sdk CLI commands for init a project, build, and deploy
3. **Modularize Code**: Split complex configurations into smaller, reusable modules
   - for `script` properties, create separate `/src/fluent/server/*.js` files and import them
   - to create `/src/fluent/server/*.js` file, use ServiceNow Scripting API to create JavaScript file, *not* TypeScript
4. **Validate Early**: Test your code locally before deploying to instances
5. **Use SDK Commands**: Utilize the ServiceNow SDK CLI for efficient workflows

## Working with Specific Metadata Types

Fluent provides specialized APIs for each ServiceNow metadata type, with methods tailored to their specific attributes and behaviors.

You are currently interested in working with the following metadata types:
