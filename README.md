# MCP Server for Fluent (ServiceNow SDK)

MCP Server for [Fluent (ServiceNow SDK)](https://www.servicenow.com/docs/bundle/yokohama-application-development/page/build/servicenow-sdk/concept/servicenow-fluent.html), a TypeScript-based declarative domain-specific language for creating and managing metadata, modules, records and tests in ServiceNow platform. It supports all commands available in the ServiceNow SDK CLI and provides access to Fluent Plugin's API specifications, code snippets, and instructions for various metadata types. It can be configured for any MCP client with stdio, such as VSCode Agent mode, Claude Code, Cursor, or Windsurf, for either development or learning purposes.

## Overview

Fluent (ServiceNow SDK) MCP bridges development tools with AI-assisted development environments by implementing the [Model Context Protocol](https://github.com/modelcontextprotocol). It enables developers and AI Agents to interact with Fluent commands and access resources like API specifications, code snippets, and instructions through natural language.

Key capabilities include:

- All ServiceNow SDK CLI commands: `version`, `help`, `auth`, `init`, `build`, `install`, `upgrade`, `dependencies`, `transform`
- ServiceNow instance `basic` or `oauth` authentication (optional, only needed for CLI commands, not for resources)
- Resource capability of API specifications for metadata types like `acl`, `business-rule`, `client-script`, `table`, `ui-action` and more
- Code snippets and examples for different metadata types
- Instructions for creating and modifying metadata types

Example prompt:

```text
Create a new Fluent app under ~/Downloads/fluent-app to track employee time off requests
```

## Tools

### ServiceNow SDK Commands

Note: Use `init` command to switch to a working directory for existing Fluent projects or to create a new one.

| Tool Name      | Description                                         | Parameters                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`      | Get ServiceNow SDK version information              | None                                                                                                                                                                                                                        |
| `help`         | Get help information about ServiceNow SDK commands  | `command`: (Optional) The specific command to get help for                                                                                                                                                                  |
| `upgrade`      | Upgrade ServiceNow SDK to the latest version        | `check`: (Optional) Only check for updates without upgrading, `debug`: (Optional) Enable debug - **disabled for now**                                                                                                                         |
| `auth`         | Authenticate to a ServiceNow instance               | `add`: (Optional) Instance URL to add, `type`: (Optional) Authentication method, `alias`: (Optional) Alias for the instance                                                                                                 |
| `init`         | Initialize a new ServiceNow application             | `from`: (Optional) sys_id or path, `appName`: App name, `packageName`: Package name, `scopeName`: Scope name, `auth`: (Optional) Authentication alias, `template`: (Optional) Project template (base, javascript.react, typescript.basic, typescript.react, javascript.basic) [new in now-sdk@v4] Select a template that defines the default application structure: `Basic now-sdk boilerplate`: An application with only the basic structure necessary for development in source code. `JavaScript now-sdk + basic`: An application configured for development in ServiceNow Fluent and JavaScript. `JavaScript now-sdk + fullstack React`: An application configured for development in ServiceNow Fluent, JavaScript, and React. `TypeScript now-sdk + basic`: An application configured for development in ServiceNow Fluent and TypeScript. TypeScript source files in the src/server directory are transpiled into JavaScript modules. `TypeScript now-sdk + fullstack React`: An application configured for development in ServiceNow Fluent, TypeScript, and React. TypeScript source files in the src/server directory are transpiled into JavaScript modules.|
| `build`        | Build a ServiceNow application package              | `source`: Path to source files, `frozenKeys`: (Optional) Whether to use frozen keys                                                                                                                                         |
| `install`      | Install a ServiceNow application to an instance     | `source`: (Optional) Package path, `reinstall`: (Optional) Whether to reinstall, `auth`: (Optional) Authentication alias, `open-browser`: (Optional) Open browser after install, `info`: (Optional) Show info after install |
| `transform`    | Transform ServiceNow metadata to Fluent source code | `from`: (Optional) Path to metadata, `directory`: (Optional) Package path, `preview`: (Optional) Preview only, `auth`: (Optional) Authentication alias                                                                      |
| `dependencies` | Download application dependencies                   | `directory`: (Optional) Package path, `auth`: (Optional) Authentication alias                                                                                                                                               |

### auth, init and dependencies commands

All these three commands are interactive CLI commands that require user input. The easier way to use them is to have Fluent MCP generate the shell command then run them in a terminal. Preferably, whenever you start a session with Fluent MCP, specify the working directory please.

## Resources

All resources follow standardized URI patterns according to the MCP specification:

1. **API Specifications**: `sn-spec://{metadataType}`
   - Example: `sn-spec://business-rule`
   - Contains API documentation with parameter descriptions

2. **Instructions**: `sn-instruct://{metadataType}`
   - Example: `sn-instruct://script-include`
   - Offers guidance and best practices

3. **Code Snippets**: `sn-snippet://{metadataType}/{snippetId}`
   - Example: `sn-snippet://acl/0001`
   - Provides practical examples

4. **Prompts**: `sn-prompt://{promptId}`
   - Example: `sn-prompt://coding_in_fluent`
   - Contains development guides and best practices

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
- `atf`: Automated Test Framework, including various ATF components

Resources can be accessed by direct URI or through the `resources/list` method.

## Requirements

- Node.js 22.15.1 or later
- npm 11.4.1 or later

### Client Integration

#### Claude Desktop / Claude on macOS

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": ["-y", "@modesty/fluent-mcp"],
      "env": {
        "SN_INSTANCE_URL": "http://localhost:8080",
        "SN_AUTH_TYPE": "oauth"
      }
    }
  }
}
```

#### VSCode GitHub Copilot Agent Mode

1. `Shift + CMD + p` to open command palette, search for `MCP: Add Server...`
2. Select `NPM Package. (Model Assisted)` as server type.
3. Fill in package name as `@modesty/fluent-mcp` and follow prompts.

```json
{
  "mcp": {
    "servers": {
      "fluent-mcp": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@modesty/fluent-mcp"],
        "env": {
          "SN_INSTANCE_URL": "http://localhost:8080",
          "SN_AUTH_TYPE": "oauth"
        }
      }
    }
  }
}
```

#### Cursor

Add MCP server configuration in Cursor settings:

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": ["-y", "@modesty/fluent-mcp"],
      "env": {
        "SN_INSTANCE_URL": "http://localhost:8080",
        "SN_AUTH_TYPE": "oauth"
      }
    }
  }
}
```

#### Windsurf

1. `CMD + ,` to open settings, navigate to Cascade => MCP Servers => Manage MCPs => View raw config
2. Add configuration.

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": ["-y", "@modesty/fluent-mcp"],
      "env": {
        "SN_INSTANCE_URL": "http://localhost:8080",
        "SN_AUTH_TYPE": "oauth"
      }
    }
  }
}
```

3. Refresh when back to Manage MCPs page.

#### Gemini CLI

Configure in `~/.gemini/settings.json` or `./.gemini/settings.json`:

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@modesty/fluent-mcp"
      ],
      "env": {
        "SN_INSTANCE_URL": "http://localhost:8080",
        "SN_AUTH_TYPE": "oauth"
      }
    }
  }
}
```

## Getting Started

1. **Authentication**  
   a. Create a new auth alias: `create Fluent auth to <instanceUrl>, add the credential alias as myFluentMcpAuth`  
   b. List existing aliases: `show all Fluent auth profiles`  
   c. Switch default alias: `use the alias <myFluentMcpAuth> as the default Fluent auth`

2. **Project Setup**  
   a. Create a new project: `Create a Fluent project to <what_you_want_the_app_to_do> under directory <cwd>`  
   b. Convert an existing app:  
      • By sys_id: `Create a Fluent project by converting the existing scoped app whose sys_id is <xxx> under directory <cwd>`  
      • By local path: `Create a Fluent project by converting the existing scoped app from <scoped_app_path>, new Fluent project should be stored in directory <cwd>`  
   c. Continue an existing project: `Initialize Fluent project in <cwd>` or `Set Fluent working directory to <cwd>`

### Example Prompts

When testing with Claude Desktop, check the MCP server logs (typically in `~/Library/Logs/Claude/mcp-server-fluent-mcp.log`) to see the actual resource requests being processed.

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

"I'm working on a ServiceNow app. Can you show me how to create a UI Action?"

## License

MIT
