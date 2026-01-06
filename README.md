# Fluent MCP Server

An [MCP server](https://modelcontextprotocol.io) that brings [ServiceNow Fluent SDK](https://www.servicenow.com/docs/bundle/yokohama-application-development/page/build/servicenow-sdk/concept/servicenow-fluent.html) capabilities to AI-assisted development environments. Enables natural language interaction with ServiceNow SDK commands, API specifications, code snippets, and development resources.

## Key Features

- **🤖 AI-Powered Error Analysis** - Intelligent diagnosis with root cause, solutions, and prevention tips (MCP Sampling)
- **Complete SDK Coverage** - All ServiceNow SDK commands: `auth`, `init`, `build`, `install`, `dependencies`, `transform`, `download`, `clean`, `pack`
- **Rich Resources** - API specifications, code snippets, instructions for 35+ metadata types
- **Multi-Environment Auth** - Supports `basic` and `oauth` authentication with profile management
- **Session-Aware** - Maintains working directory context across commands

This MCP server implements the complete [Model Context Protocol](https://modelcontextprotocol.io) specification with the following capabilities:

### Core

- **Resources** - Provides 100+ resources across 35+ ServiceNow metadata types (API specs, instructions, snippets, prompts)
- **Tools** - Exposes 10 ServiceNow SDK commands as MCP tools with full parameter validation
- **Prompts** - Offers development workflow templates for common ServiceNow tasks
- **Logging** - Structured logging for debugging and monitoring

### Client Capabilities (used by this server)

The server leverages these MCP client capabilities when available:

- **Roots** - Requests workspace roots from the client for context-aware operations
  - Falls back to project root when client doesn't provide roots

- **Sampling** (MCP 2024-11-05) - Leverages client LLM for intelligent error analysis when SDK commands fail
  - Automatically analyzes command errors >50 characters
  - Provides structured diagnostics: root cause, solutions, prevention tips
  - Configurable via `FLUENT_MCP_ENABLE_ERROR_ANALYSIS` environment variable

- **Elicitation** (MCP 2024-11-05) - Interactive parameter collection for complex workflows
  - **`init_fluent_app`** - Prompts for missing project parameters (workingDirectory, template, appName, etc.)
  - Supports both creation and conversion workflows with smart validation
  - Handles user acceptance/rejection of elicited data

- **Session Management** - Tracks working directory per session for multi-project workflows
- **Root Fallback** - Automatically falls back to MCP root context when no session directory is set
- **Error Handling** - Comprehensive error messages with actionable guidance
- **Type Safety** - Full TypeScript implementation with strict typing

## Quick Start

```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector npx @modesty/fluent-mcp

# Or use in your MCP client (see Configuration below)
```

**Example prompt:**

```text
Create a new Fluent app in ~/projects/time-off-tracker to manage employee PTO requests
```

## Available Tools

### SDK Commands

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `sdk_info` | Get SDK version, help, or debug info | `flag` (-v/-h/-d), `command` (optional) |
| `manage_fluent_auth` | Manage instance authentication profiles | `add`, `list`, `delete`, `use`, `type` (basic/oauth) |
| `init_fluent_app` | Initialize or convert ServiceNow app | `workingDirectory` (required), `template`, `from` (optional) |
| `build_fluent_app` | Build the application | `debug` (optional) |
| `deploy_fluent_app` | Deploy to ServiceNow instance | `auth` (optional), `debug` (optional) |
| `fluent_transform` | Convert XML to Fluent TypeScript | `from`, `auth` (optional) |
| `download_fluent_dependencies` | Download dependencies and type definitions | `auth` (optional) |
| `download_fluent_app` | Download metadata from instance | `directory`, `incremental` (optional) |
| `clean_fluent_app` | Clean output directory | `source` (optional) |
| `pack_fluent_app` | Create installable artifact | `source` (optional) |

> **Note:** `manage_fluent_auth`, `init_fluent_app`, and `download_fluent_dependencies` are interactive commands. Use `init_fluent_app` to establish working directory context for subsequent commands.

## Resources

Standardized URI patterns following MCP specification:

| Resource Type | URI Pattern | Example | Purpose |
|---------------|-------------|---------|----------|
| **API Specs** | `sn-spec://{type}` | `sn-spec://business-rule` | API documentation and parameters |
| **Instructions** | `sn-instruct://{type}` | `sn-instruct://script-include` | Best practices and guidance |
| **Code Snippets** | `sn-snippet://{type}/{id}` | `sn-snippet://acl/0001` | Practical code examples |
| **Prompts** | `sn-prompt://{id}` | `sn-prompt://coding_in_fluent` | Development guides |

### Supported Metadata Types

**Core Types:** `acl`, `application-menu`, `business-rule`, `client-script`, `cross-scope-privilege`, `form`, `list`, `property`, `role`, `scheduled-script`, `script-action`, `script-include`, `scripted-rest`, `service-portal`, `table`, `ui-action`, `ui-page`, `user-preference`

**Table Types:** `column`, `column-generic`

**ATF (Automated Test Framework):** `atf-appnav`, `atf-catalog-action`, `atf-catalog-validation`, `atf-catalog-variable`, `atf-email`, `atf-form`, `atf-form-action`, `atf-form-declarative-action`, `atf-form-field`, `atf-reporting`, `atf-rest-api`, `atf-rest-assert-payload`, `atf-server`, `atf-server-catalog-item`, `atf-server-record`

## Configuration

**Requirements:** Node.js 22.15.1+, npm 11.4.1+

### MCP Client Setup

Add to your MCP client configuration file:

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": ["-y", "@modesty/fluent-mcp"],
      "env": {
        "SN_INSTANCE_URL": "https://your-instance.service-now.com",
        "SN_AUTH_TYPE": "oauth"
      }
    }
  }
}
```

**Client-Specific Locations:**

- **Claude Desktop / macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **VSCode Copilot:** `.vscode/mcp.json` (use Command Palette: `MCP: Add Server...`)
- **Cursor:** Settings → Features → MCP Settings
- **Windsurf:** Settings → Cascade → MCP Servers → View raw config
- **Gemini CLI:** `~/.gemini/settings.json`

> **VSCode note:** For VSCode, the JSON structure uses `"mcp": { "servers": { ... } }` instead of `"mcpServers"`.

**Environment Variables:**

- `SN_INSTANCE_URL` - ServiceNow instance URL (optional, can use auth profiles instead)
- `SN_AUTH_TYPE` - Authentication method: `basic` or `oauth` (optional)
- `FLUENT_MCP_ENABLE_ERROR_ANALYSIS` - Enable AI error analysis (default: `true`)
- `FLUENT_MCP_MIN_ERROR_LENGTH` - Minimum error length for analysis (default: `50`)

## Usage Examples

### Typical Workflow

1. **Setup Authentication**

   ```text
   Create a new auth profile for https://dev12345.service-now.com with alias dev-instance
   ```

2. **Initialize Project**

   ```text
   Create a new Fluent app in ~/projects/asset-tracker for IT asset management
   ```

3. **Develop with Resources**

   ```text
   Show me the business-rule API specification and provide an example snippet
   ```

4. **Build and Deploy**

   ```text
   Build the app with debug output, then deploy to dev-instance
   ```

## Testing with MCP Inspector

The [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) provides a web interface for testing MCP servers.

### Launch Inspector

```bash
# Test published package
npx @modelcontextprotocol/inspector npx @modesty/fluent-mcp

# Or for local development
npm run build && npm run inspect
```

### Test Scenarios

#### Scenario 1: Explore Business Rule Resources

**Objective:** Access API specs and code snippets for business rules

**Steps:**

1. Launch Inspector and wait for server connection
2. Navigate to **Resources** tab
3. Find and click `sn-spec://business-rule` in the resource list
4. Review the API specification showing all available methods and parameters
5. Go back and search for `sn-snippet://business-rule/0001`
6. Click the snippet to view a complete TypeScript example
7. Verify content includes proper imports and follows Fluent patterns

**Expected Results:**

- API spec displays structured documentation with method signatures
- Snippet shows runnable TypeScript code with ServiceNow metadata patterns
- Content is properly formatted and readable

#### Scenario 2: Test SDK Info Command

**Objective:** Verify SDK version and help information retrieval

**Steps:**

1. Navigate to **Tools** tab
2. Select `sdk_info` from the tool list
3. **Test Version:**
   - Set `flag` parameter to `-v`
   - Click **Execute**
   - Verify response shows version number (e.g., "4.0.1")
4. **Test Help:**
   - Set `flag` parameter to `-h`
   - Set `command` parameter to `build`
   - Click **Execute**
   - Verify response shows build command documentation with options
5. Monitor **Notifications** pane for command execution logs

**Expected Results:**

- Version command returns SDK version string
- Help command returns detailed command documentation
- No errors in notifications pane
- Commands execute within 2-3 seconds

## License

MIT
