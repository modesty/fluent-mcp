# MCP Server for Fluent (ServiceNow SDK)

A stdio MCP Server for [Fluent (ServiceNow SDK)](https://www.servicenow.com/docs/bundle/yokohama-application-development/page/build/servicenow-sdk/concept/servicenow-fluent.html), a TypeScript-based declarative domain-specific language for creating and managing metadata, modules, records and tests in ServiceNow platform. It support all commands available in the ServiceNow SDK CLI, and provides access to primary Fluent Plugin's API specifications, code snippets, and instructions for various metadata types. It can be configured for any MCP client, such as VSCode Agent mode, Claude Desktop, Cursor, or Windsurf, for either development or learning purposes.

## Description

Fluent (ServiceNow SDK) MCP bridges ServiceNow development tools with modern AI-assisted development environments by implementing the [Model Context Protocol](https://github.com/modelcontextprotocol). It enables developers and AI assistants to interact with Fluent (ServiceNow SDK) commands and access resources like API specifications, code snippets, and instructions through natural language.

## Usage

### Using with an MCP Client

The MCP server communicates via stdio according to the MCP specification, allowing any compatible MCP client to interact with it.

## Features

- Access to all ServiceNow SDK CLI commands, including:`version`,`help`,`debug`,`upgrade`,`auth`,`init`,`build`,`install`,`transform`,`dependencies`
- ServiceNow authentication via `@servicenow/sdk auth --add <instance>`
- Access to API specifications for different metadata types, including `acl`, `application-menu`, `business-rule`, `client-script`, `cross-scope-privilege`, `form`, `list`, `property`, `role`, `scheduled-script`, `script-include`, `scripted-rest`, `table`, `ui-action`, `user-preference` and more to come
- Access to code snippets and examples for different metadata types
- Access to instructions for creating and modifying different metadata types

Example of prompt to create a new Fluent application:

```text
Create a new Fluent app under ~/Downloads/fluent-app to track employee time off requests
```

Watch how the MCP server responds to help LLM create auth credential alias, tables (i.e., dictionary, or data model) for time off requests, business rules to handle request approvals, ACLs to control access, Form view to access time off request info, UI Actions to enhance user experience, and more.

## Available MCP Tools

### ServiceNow SDK Command Tools

Note, use `init` command to switch to a working directory for existing Fluent (ServiceNow SDK) project, or to create a new one.

| Tool Name      | Description                                         | Parameters                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`      | Get ServiceNow SDK version information              | None                                                                                                                                                                                                                        |
| `help`         | Get help information about ServiceNow SDK commands  | `command`: (Optional) The specific command to get help for                                                                                                                                                                  |
| `debug`        | Enable debug mode for ServiceNow SDK commands       | `command`: The command to run with debug mode enabled                                                                                                                                                                       |
| `upgrade`      | Upgrade ServiceNow SDK to the latest version        | `check`: (Optional) Only check for updates without upgrading, `debug`: (Optional) Enable debug mode                                                                                                                         |
| `auth`         | Authenticate to a ServiceNow instance               | `add`: (Optional) Instance URL to add, `type`: (Optional) Authentication method, `alias`: (Optional) Alias for the instance                                                                                                 |
| `init`         | Initialize a new ServiceNow application             | `from`: (Optional) sys_id or path, `appName`: App name, `packageName`: Package name, `scopeName`: Scope name, `auth`: (Optional) Authentication alias                                                                       |
| `build`        | Build a ServiceNow application package              | `source`: Path to source files, `frozenKeys`: (Optional) Whether to use frozen keys                                                                                                                                         |
| `install`      | Install a ServiceNow application to an instance     | `source`: (Optional) Package path, `reinstall`: (Optional) Whether to reinstall, `auth`: (Optional) Authentication alias, `open-browser`: (Optional) Open browser after install, `info`: (Optional) Show info after install |
| `transform`    | Transform ServiceNow metadata to Fluent source code | `from`: (Optional) Path to metadata, `directory`: (Optional) Package path, `preview`: (Optional) Preview only, `auth`: (Optional) Authentication alias                                                                      |
| `dependencies` | Download application dependencies                   | `directory`: (Optional) Package path, `auth`: (Optional) Authentication alias                                                                                                                                               |

### Resource Tools

| Tool Name             | Description                                               | Parameters                                                                                              |
| --------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `get-api-spec`        | Get API specification for a ServiceNow metadata type      | `metadataType`: The metadata type to get specifications for                                             |
| `get-snippet`         | Get code snippet for a ServiceNow metadata type           | `metadataType`: The metadata type to get snippets for, `id`: (Optional) Specific snippet ID to retrieve |
| `get-instruct`        | Get instructions for a ServiceNow metadata type           | `metadataType`: The metadata type to get instructions for                                               |
| `get-prompt`          | Get specialized prompts for ServiceNow Fluent development | `promptId`: The ID of the prompt to retrieve (e.g., `coding_in_fluent`)                                 |
| `list-metadata-types` | List all available ServiceNow metadata types              | None                                                                                                    |

### Supported Metadata Types

- `acl`: Access Control Lists
- `application-menu`: Application Menus
- `business-rule`: Business Rules
- `client-script`: Client Scripts
- `cross-scope-privilege`: Cross Scope Privileges
- `form`: Forms
- `list`: Lists
- `property`: System Properties
- `role`: Roles
- `scheduled-script`: Scheduled Scripts
- `script-include`: Script Includes
- `scripted-rest`: Scripted REST APIs
- `table`: Tables
- `ui-action`: UI Actions
- `user-preference`: User Preferences
- `atf`: Automated Test Framework, including 'atf-appnav', 'atf-catalog-action','atf-catalog-validation','atf-catalog-variable','atf-email','atf-form','atf-form-action','atf-form-declarative-action','atf-form-field','atf-reporting','atf-rest-api','atf-rest-assert-payload','atf-server','atf-server-catalog-item','atf-server-record',

## Resources Capabilities

The MCP server provides access to various resources that enhance the development experience with ServiceNow Fluent SDK. These resources are designed to assist developers and AI models in understanding and implementing ServiceNow features effectively:

### Resource URI Formats

All resources follow standardized URI patterns according to the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/server):

1. **API Specifications**: `sn-spec://{metadataType}`

   - Example: `sn-spec://business-rule`
   - Provides detailed technical specifications for ServiceNow metadata types
   - Contains complete API documentation with parameter descriptions and usage guidelines

2. **Instructions**: `sn-instruct://{metadataType}`

   - Example: `sn-instruct://script-include`
   - Offers guidance and best practices for working with specific metadata types
   - Includes implementation notes and considerations

3. **Code Snippets**: `sn-snippet://{metadataType}/{snippetId}`

   - Example: `sn-snippet://acl/0001`
   - Presents practical examples of how to implement various ServiceNow features
   - Multiple snippets may be available for each metadata type (with different IDs)
   - Supports auto-completion for available snippet IDs

4. **Prompts**: `sn-prompt://{promptId}`
   - Example: `sn-prompt://coding_in_fluent`
   - Provides comprehensive guides and best practices for Fluent development
   - Contains detailed information on coding patterns, standards, and recommendations

### Resource Navigation

Resources can be discovered and accessed in two ways:

1. **Direct URI access**: Use the URI formats above to directly access a specific resource
2. **Resource listing**: Query available resources using the `resources/list` method
   - Returns all available resources with their URIs, titles, and MIME types
   - Resources can be filtered by metadata type

### Resource Content

All resources are returned as Markdown text, which includes:

- Detailed technical documentation for API specifications
- Implementation guidelines for instructions
- Well-commented code examples for snippets

### Prompt Capabilities

The MCP server also provides access to specialized prompts that enhance the development experience with ServiceNow Fluent SDK:

#### Available Prompts

| Prompt Name        | Description                                   | URI Format                     |
| ------------------ | --------------------------------------------- | ------------------------------ |
| `Coding in Fluent` | General guide for coding in ServiceNow Fluent | `sn-prompt://coding_in_fluent` |

#### Prompt Content

The `Coding in Fluent` prompt includes:

- Introduction to Fluent (ServiceNow SDK) features and benefits
- Key concepts in Fluent development
- Syntax guidelines and best practices
- Tips for working with specific metadata types
- Examples of proper Fluent code patterns
- Common pitfalls to avoid

This prompt is particularly useful for developers new to Fluent or those looking for a quick reference on Fluent coding standards.

## Requirements

- Node.js 22.15.1 or later
- npm 11.4.1 or later

## Configuration with AI Tools

### Claude Desktop / Claude on macOS

To configure the Fluent MCP Server for Claude Desktop:

1. Configure Claude Desktop to use the MCP server:

   - Settings > Developers
   - Add a new MCP Server with configuration:

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": ["-y", "@modesty/fluent-mcp"]
    }
  }
}
```

When testing with Claude Desktop, check the MCP server logs (typically in `~/Library/Logs/Claude/mcp-server-fluent-mcp.log`) to see the actual resource requests being processed.

Example usage in Clause Desktop Chat:

#### Domain-Driven Business Rule

Prompt:
"I'm building a ServiceNow application for IT asset management. Using Fluent, help me design and implement a domain-driven business rule for the following scenario:
When an IT asset (like a laptop) is assigned to an employee, I need to:

Validate the asset is available and not already assigned
Update the asset status to 'In Use'
Create an audit trail entry
Notify the asset manager if it's a high-value asset (>$2000)

Please show me the business rule structure using Fluent's TypeScript API, following SOLID principles. Think of this like designing a service layer in a traditional enterprise application - how would you structure the business logic to be maintainable and testable?"

#### Legacy Application Modernization with Transform

Prompt:
"I have a legacy ServiceNow application with scattered XML customizations that violate SOLID principles. Using Fluent MCP's transform capabilities, help me:

Transform the existing XML-based business rules into modern TypeScript code
Refactor the code to follow single responsibility principle
Show me how to extract reusable script includes for common operations

Use the transform command to convert my existing 'Incident Management' customizations, then demonstrate how to restructure them using proper separation of concerns - like how you'd refactor a monolithic service into microservices."

#### Test-Driven Development with ATF Integration

Prompt:
"Using Fluent MCP tools, help me set up a test-driven development workflow for ServiceNow. I want to:

Create a new application for 'Employee Onboarding'
Set up the project structure with proper dependency management
Show me how to write ATF tests for business rules before implementing them
Demonstrate the build and install process

Think of this like setting up a new Spring Boot project with Maven - show me the equivalent best practices for ServiceNow development using Fluent SDK."

#### API-First Development with Scripted REST

Prompt:

"Help me design and implement a RESTful API for a ServiceNow application using Fluent MCP tools. The API should handle 'Project Management' operations:

GET /projects - list all projects
POST /projects - create new project
PUT /projects/{id} - update project
DELETE /projects/{id} - delete project

Show me how to:

Use the scripted-rest metadata type to define the API endpoints
Implement proper error handling and validation
Follow REST best practices and HTTP status codes
Structure the code using dependency injection patterns

This should be like building a REST controller in Spring Boot - clean, testable, and following OpenAPI standards."

#### Full-Stack Application Development Pipeline

Prompt:
"Using all Fluent MCP capabilities, walk me through creating a complete ServiceNow application from scratch. I want to build a 'Vendor Management' system with:

Custom tables for vendors, contracts, and purchase orders
Business rules for validation and workflow
Client scripts for UI interactions
REST APIs for external integration
Proper authentication and authorization

Show me the complete development workflow:

Initialize the project with proper structure
Set up dependencies and build configuration
Implement the domain models and business logic
Create the UI components and forms
Build and deploy to a development instance

Think of this as building a full-stack application with proper CI/CD pipeline - what would be the ServiceNow equivalent using Fluent SDK?"

### VSCode GitHub Copilot Agent Mode

1. `Shift + CMD + p` to open VS Code command palette, search for `MCP: Add Server...`
2. Select `NPM Package.  (Model Assisted)` as the server type.
3. Fill in package name as `@modesty/fluent-mcp` and follow the prompts to complete the setup.
4. Restart VS Code and the agent will now have access to ServiceNow Fluent SDK tools.
5. If any issues arise, ensure the `~/Library/Application Support/Code/User/settings.json` file is correctly configured.

```json
"mcp": {
  "servers": {
			"fluent-mcp": {
				"command": "npx",
				"args": [
					"-y",
					"@modesty/fluent-mcp"
				],
				"cwd": "${input:cwd}"
			}
		}
}
```

### Example usage in VS Code Agent Chat

#### Script Include Dependency Pattern

Prompt:
"Create a UserService script include that depends on a BaseService script include. Show the TypeScript API calls for both, implementing constructor injection pattern. Use get-api-spec script-include to verify the structure."

#### Multi-Environment Auth Setup

Prompt:
"Configure auth profiles for dev/test/prod environments, then create a build script that deploys to each sequentially. Handle auth failures with rollback. Show the exact manage_fluent_auth and fluent_install commands."

#### Form Field Validation Chain

Prompt:
"Create 3 client scripts: onChange validation for 'priority' field, onLoad to set field states, onSubmit for final validation. Make them work together using shared utility functions. Use the client-script API spec."

#### Legacy Code Transformation

Prompt:
"Transform existing business rules from instance using fluent_transform, identify SOLID violations, refactor into separate script includes, then rebuild. Show the complete transform → refactor → build workflow."

#### Business Rule Error Handling

Prompt:
"Create before/after/async business rules for incident creation with proper error handling, logging, and transaction rollback. Show how to coordinate execution order and handle failures gracefully."

### Cursor

To configure the Fluent MCP Server for Cursor:

1. Add a new MCP Server with the following configuration:

   - Open Cursor settings
   - Navigate to MCP Servers
   - Add a new MCP Server with the following configuration:

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": ["-y", "@modesty/fluent-mcp"]
    }
  }
}
```

Example usage in Cursor:

```text
I'm working on a ServiceNow app. Can you show me how to create a UI Action?
```

### Windsurf

To configure the Fluent MCP Server for Windsurf:

1. `CMD + ,` to open Windsurf settings, and navigate to the Cascade section.
2. Click `Add Server` in `Model Context Protocol (MCP) Servers` section.
3. Select `Add Custom MCP Server +` in the `Model Context Protocol (MCP) Servers Templates` popup.
4. Paste in the following to `mcp_config.json`:

   ```json
   {
     "mcpServers": {
       "fluent-mcp": {
         "command": "npx",
         "args": ["-y", "@modesty/fluent-mcp"]
       }
     }
   }
   ```

5. After closing the `mcp_config.json` edit tab, click `Refresh` in the `Model Context Protocol (MCP) Servers` section to apply the changes. All tools under `fluent-mcp` will be listed and available when refreshing is complete.

6. Example usage
   in Windsurf:

```text
* Show the help on how to authenticate to ServiceNow instance using Fluent
* Authenticate me to http://localhost:8080 with my credentials
```

### Gemini CLI

To configure the Fluent MCP Server for Gemini CLI:

1. Open the Gemini CLI configuration file
    - User's setting: `~/.gemini/settings.json`
    - Project's setting: `./.gemini/settings.json`
2. Add the following MCP server configuration:

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@modesty/fluent-mcp"
      ]
    }
  }
}
```

Example usage in Gemini CLI:

```text
show me an example of creating a table with 3 columns, String, Boolean and Reference in Fluent ;
create a business rule to ensure the assigned_to is not null when insert and update for the table created above 
```

## License

MIT
