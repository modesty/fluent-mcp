# MCP Server for Fluent (ServiceNow SDK)

MCP Server for [Fluent (ServiceNow SDK)](https://www.servicenow.com/docs/bundle/yokohama-application-development/page/build/servicenow-sdk/concept/servicenow-fluent.html), a TypeScript-based declarative domain-specific language for creating and managing metadata, modules, records and tests in ServiceNow platform. It supports all commands available in the ServiceNow SDK CLI and provides access to Fluent Plugin's API specifications, code snippets, and instructions for various metadata types. It can be configured for any MCP client with stdio, such as VSCode Agent mode, Claude Code, Cursor, or Windsurf, for either development or learning purposes.

## Overview

Fluent (ServiceNow SDK) MCP bridges development tools with AI-assisted development environments by implementing the [Model Context Protocol](https://github.com/modelcontextprotocol). It enables developers and AI Agents to interact with Fluent commands and access resources like API specifications, code snippets, and instructions through natural language.

Key capabilities include:

- **Complete ServiceNow SDK CLI coverage**: All native SDK commands are now available including `auth`, `init`, `build`, `install`, `dependencies`, `transform`, `download`, `clean`, and `pack`
- **Enhanced SDK information access**: Get SDK version, help, and debug information with improved `sdk_info` command
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

Note: Use `init_fluent_app` command to switch to a working directory for existing Fluent projects or to create a new one.

| Tool Name                      | Description                                         | Parameters                                                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk_info`                     | Get Fluent (ServiceNow SDK) information using native SDK flags | `flag`: SDK flag to execute (-v/--version, -h/--help, -d/--debug), `command`: (Optional) Specific command to get help for (only used with -h/--help flag)                                                               |
| `manage_fluent_auth`           | Manage Fluent (ServiceNow SDK) authentication to instance | `add`: (Optional) Instance URL to add, `type`: (Optional) Authentication method, `alias`: (Optional) Alias for the instance, `list`: (Optional) List auth profiles, `delete`: (Optional) Delete auth profile, `use`: (Optional) Switch default auth |
| `init_fluent_app`              | Initialize a new ServiceNow custom application or convert a legacy application | `from`: (Optional) sys_id or path, `appName`: App name, `packageName`: Package name, `scopeName`: Scope name, `workingDirectory`: Directory for the project, `template`: Project template (base, javascript.react, typescript.basic, typescript.react, javascript.basic), `intent`: (Optional) Creation or conversion intent |
| `build_fluent_app`             | Build the Fluent (ServiceNow SDK) application      | `debug`: (Optional) Print debug output                                                                                                                                                                                     |
| `deploy_fluent_app`            | Deploy the Fluent (ServiceNow SDK) application to a ServiceNow instance | `auth`: (Optional) Authentication alias to use, `debug`: (Optional) Print debug output                                                                                                                                     |
| `fluent_transform`             | Download and convert XML records from instance or local path into Fluent source code | `from`: (Optional) Path to metadata, `directory`: (Optional) Package path, `preview`: (Optional) Preview only, `auth`: (Optional) Authentication alias, `debug`: (Optional) Print debug output                         |
| `download_fluent_dependencies` | Download configured dependencies in now.config.json and TypeScript type definitions | `auth`: (Optional) Authentication alias to use, `debug`: (Optional) Print debug output                                                                                                                                     |
| `download_fluent_app` **NEW**  | Download application metadata from instance        | `directory`: Path to expand application, `source`: (Optional) Path to directory containing package.json configuration, `incremental`: (Optional) Download in incremental mode, `debug`: (Optional) Print debug output   |
| `clean_fluent_app` **NEW**     | Clean output directory                              | `source`: (Optional) Path to directory containing package.json configuration, `debug`: (Optional) Print debug output                                                                                                        |
| `pack_fluent_app` **NEW**      | Zip built app into installable artifact            | `source`: (Optional) Path to directory containing package.json configuration, `debug`: (Optional) Print debug output                                                                                                        |

### Recent Updates

**Complete ServiceNow SDK Command Coverage** - fluent-mcp now provides 100% coverage of all native ServiceNow SDK commands:

- **✅ Enhanced `sdk_info` command**: Get SDK version, help, and debug information with improved working directory resolution and error handling
- **✅ New `download_fluent_app` command**: Download application metadata from instance with support for incremental downloads and custom source directories
- **✅ New `clean_fluent_app` command**: Clean output directories with proper package.json configuration detection
- **✅ New `pack_fluent_app` command**: Create installable application artifacts from built applications
- **✅ All commands aligned**: Parameter descriptions and functionality match the native SDK specification exactly

### Interactive Commands

All `manage_fluent_auth`, `init_fluent_app` and `download_fluent_dependencies` commands are interactive CLI commands that require user input. The easier way to use them is to have Fluent MCP generate the shell command then run them in a terminal. Preferably, whenever you start a session with Fluent MCP, specify the working directory please.

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
1. Add configuration.

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

1. Refresh when back to Manage MCPs page.

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
   a. Create a new auth alias: `Use manage_fluent_auth to create a new auth profile for <instanceUrl> with alias myFluentMcpAuth`  
   b. List existing aliases: `Use manage_fluent_auth to show all auth profiles`  
   c. Switch default alias: `Use manage_fluent_auth to set myFluentMcpAuth as the default auth`

1. **Project Setup**  
   a. Create a new project: `Use init_fluent_app to create a new Fluent project for <what_you_want_the_app_to_do> in directory <cwd>`  
   b. Convert an existing app:  
      • By sys_id: `Use init_fluent_app to convert the existing scoped app with sys_id <xxx> to a Fluent project in directory <cwd>`  
      • By local path: `Use init_fluent_app to convert the existing scoped app from <scoped_app_path> to a Fluent project in directory <cwd>`  
   c. Continue an existing project: `Use init_fluent_app to initialize the Fluent project in <cwd>` or `Set working directory to <cwd> for the Fluent project`

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
"Configure auth profiles for dev/test/prod environments, then create a build script that deploys to each sequentially. Handle auth failures with rollback. Show the exact manage_fluent_auth and deploy_fluent_app commands."

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

## Development & Testing

### MCP Inspector

The [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) is an interactive web-based tool for testing and debugging MCP servers. It provides real-time visibility into your server's tools, resources, prompts, and notifications without requiring any permanent installation.

#### Quick Start

**Test the published NPM package:**
```bash
npx @modelcontextprotocol/inspector npx @modesty/fluent-mcp
```

Or use the convenience script:
```bash
npm run inspect:published
```

**Test the locally built server:**
```bash
npm run build
npm run inspect
```

**Test during development (without building):**
```bash
npm run inspect:dev
```

#### Using the Inspector

Once launched, the Inspector provides a web interface with:

1. **Server Connection Pane** - Configure environment variables (SN_INSTANCE_URL, SN_AUTH_TYPE) and verify server connectivity
2. **Resources Tab** - Browse and test all resources (sn-spec://, sn-instruct://, sn-snippet://, sn-prompt://)
3. **Prompts Tab** - Test prompt templates with custom arguments
4. **Tools Tab** - Explore all available tools (sdk_info, build_fluent_app, etc.) and execute them with test inputs
5. **Notifications Pane** - Monitor server logs and real-time events

#### Development Workflow

The recommended workflow for developing with fluent-mcp:

1. **Make code changes** to your server implementation
2. **Rebuild** the project: `npm run build`
3. **Launch Inspector** to test: `npm run inspect`
4. **Test your changes** interactively through the web interface
5. **Iterate** - repeat the cycle as needed

#### Environment Configuration

You can configure ServiceNow instance settings when launching the Inspector. The Inspector will pass environment variables to your server:

```bash
# Example: Test with a specific ServiceNow instance
SN_INSTANCE_URL=https://dev12345.service-now.com SN_AUTH_TYPE=oauth npm run inspect
```

#### Testing Scenarios

**Test Tools:**
- Verify all ServiceNow SDK commands are available
- Execute commands with sample parameters
- Validate error handling with invalid inputs

**Test Resources:**
- Browse API specifications: `sn-spec://business-rule`, `sn-spec://client-script`
- View code snippets: `sn-snippet://acl/0001`
- Check instructions: `sn-instruct://table`
- Access prompts: `sn-prompt://coding_in_fluent`

**Test Integration:**
- Verify working directory resolution
- Test authentication flows
- Monitor command execution and output
- Validate resource loading and caching

## License

MIT
