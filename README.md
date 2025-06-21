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

## Available MCP Tools

### ServiceNow SDK Command Tools

Note, use `init` command to switch to a working directory for existing Fluent (ServiceNow SDK) project, or to create a new one.

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `version` | Get ServiceNow SDK version information | None |
| `help` | Get help information about ServiceNow SDK commands | `command`: (Optional) The specific command to get help for |
| `debug` | Enable debug mode for ServiceNow SDK commands | `command`: The command to run with debug mode enabled |
| `upgrade` | Upgrade ServiceNow SDK to the latest version | `check`: (Optional) Only check for updates without upgrading, `debug`: (Optional) Enable debug mode |
| `auth` | Authenticate to a ServiceNow instance | `add`: (Optional) Instance URL to add, `type`: (Optional) Authentication method, `alias`: (Optional) Alias for the instance |
| `init` | Initialize a new ServiceNow application | `from`: (Optional) sys_id or path, `appName`: App name, `packageName`: Package name, `scopeName`: Scope name, `auth`: (Optional) Authentication alias |
| `build` | Build a ServiceNow application package | `source`: Path to source files, `frozenKeys`: (Optional) Whether to use frozen keys |
| `install` | Install a ServiceNow application to an instance | `source`: (Optional) Package path, `reinstall`: (Optional) Whether to reinstall, `auth`: (Optional) Authentication alias, `open-browser`: (Optional) Open browser after install, `info`: (Optional) Show info after install |
| `transform` | Transform ServiceNow metadata to Fluent source code | `from`: (Optional) Path to metadata, `directory`: (Optional) Package path, `preview`: (Optional) Preview only, `auth`: (Optional) Authentication alias |
| `dependencies` | Download application dependencies | `directory`: (Optional) Package path, `auth`: (Optional) Authentication alias |

### Resource Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `get-api-spec` | Get API specification for a ServiceNow metadata type | `metadataType`: The metadata type to get specifications for |
| `get-snippet` | Get code snippet for a ServiceNow metadata type | `metadataType`: The metadata type to get snippets for, `id`: (Optional) Specific snippet ID to retrieve |
| `get-instruct` | Get instructions for a ServiceNow metadata type | `metadataType`: The metadata type to get instructions for |
| `list-metadata-types` | List all available ServiceNow metadata types | None |

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

## Requirements

- Node.js 22.15.1 or later
- npm 11.4.1 or later

## Configuring with AI Tools

To configure the Fluent MCP Server for use with VSCode Agent mode (such as with GitHub Copilot or CodeLlama):

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

Example usage in VS Code Agent Chat:

```text
Please create a business rule for ServiceNow that validates a record before insert.
```

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
          "args": [
            "@modesty/fluent-mcp"
          ]
        }
      }
    }

    ```

Example usage in Claude Desktop:

```text
- I need to create a ServiceNow client script that validates a field value. Can you help me with that?
```

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
          "args": [
            "@modesty/fluent-mcp"
          ]
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
            "args": [
              "-y",
              "@modesty/fluent-mcp"
            ]
          }
        }
      }
      ```

5. After closing the `mcp_config.json` edit tab, click `Refresh` in the `Model Context Protocol (MCP) Servers` section to apply the changes. All tools under `fluent-mcp` will be listed and available when refereshing is complete.

6. Example usage
 in Windsurf:

```text
* Show the help on how to authenticate to ServiceNow instance using Fluent
* Authenticate me to http://localhost:8080 with my credentials
```

## License

MIT
