# Fluent MCP Server

An [MCP server](https://modelcontextprotocol.io) that brings [ServiceNow Fluent SDK](https://www.servicenow.com/docs/bundle/yokohama-application-development/page/build/servicenow-sdk/concept/servicenow-fluent.html) capabilities to AI-assisted development environments. Enables natural language interaction with ServiceNow SDK commands, API specifications, code snippets, and development resources.

Built for **`@servicenow/sdk` 4.6.0**.

## Key Features

- **Complete SDK Coverage** - ServiceNow SDK commands: `init`, `build`, `install`, `dependencies`, `transform`, `download`, `clean`, `pack`, `explain`
- **Rich Resources** - API specifications, instructions, and code snippets for **57 ServiceNow metadata types**
- **API Documentation Lookup** - `explain_fluent_api` returns SDK docs for any Fluent API or guide — no project required
- **Auto-Authentication** - Automatic auth profile detection and session management via environment variables
- **Session-Aware** - Maintains working directory and auth context across commands

This MCP server implements the [Model Context Protocol](https://modelcontextprotocol.io) specification with the following capabilities:

### Core

- **Resources** - 270+ resources across 57 ServiceNow metadata types (API specs, instructions, snippets, prompts)
- **Tools** - 10 ServiceNow SDK commands plus resource-lookup tools, with full parameter validation
- **Prompts** - Development workflow templates for common ServiceNow tasks (`coding_in_fluent`, `create_custom_ui`)
- **Logging** - Structured logging for debugging and monitoring

### Client Capabilities (used by this server)

The server leverages these MCP client capabilities when available:

- **Roots** - Requests workspace roots from the client for context-aware operations
  - Falls back to project root when client doesn't provide roots

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
| `sdk_info` | Get SDK version or help | `flag` (-v/-h), `command` (optional for -h) |
| `get-api-spec` | Get API spec or list all metadata types | `metadataType` (optional, omit to list all) |
| `explain_fluent_api` | Look up Fluent SDK documentation for any API or guide. No Fluent project required. | `topic` (optional API/guide name or tag keyword — required unless `list=true`), `list` (boolean — list topics), `peek` (boolean — brief summary), `format` (`pretty`\|`raw`), `source` (optional project path override), `debug` (optional) |
| `init_fluent_app` | Initialize or convert ServiceNow app | `workingDirectory` (required), `template`, `from` (optional) |
| `build_fluent_app` | Build the application | `debug` (optional) |
| `deploy_fluent_app` | Deploy to ServiceNow instance. Supports `--skip-flow-activation`. | `auth` (auto-injected), `debug` (optional), `skipFlowActivation` (optional) |
| `fluent_transform` | Convert XML to Fluent TypeScript | `from`, `auth` (auto-injected) |
| `download_fluent_dependencies` | Download dependencies and type definitions | `auth` (auto-injected) |
| `download_fluent_app` | Download metadata from instance | `directory`, `incremental` (optional) |
| `clean_fluent_app` | Clean output directory | `source` (optional) |
| `pack_fluent_app` | Create installable artifact | `source` (optional) |

> **Note:** Authentication is automatically configured at startup via environment variables. The `auth` parameter is auto-injected from the session for commands that require instance access. Use `init_fluent_app` to establish working directory context for subsequent commands.

#### Looking up Fluent APIs with `explain_fluent_api`

`explain_fluent_api` wraps `now-sdk explain` and returns SDK documentation for any Fluent API class **or** topic guide. It works from any directory — no Fluent project required.

| Invocation | Result |
|---|---|
| `explain_fluent_api({ topic: 'BusinessRule' })` | Full API reference for `BusinessRule` |
| `explain_fluent_api({ topic: 'BusinessRule', peek: true })` | Brief summary of `BusinessRule` |
| `explain_fluent_api({ topic: 'BusinessRule', format: 'raw' })` | Full API reference as plain markdown (good for piping into other tools) |
| `explain_fluent_api({ list: true })` | Full topic index (all APIs and guides) |
| `explain_fluent_api({ list: true, topic: 'atf' })` | Topic index filtered to entries matching `atf` |

`topic` matches an API name (e.g. `BusinessRule`, `Acl`), a guide name (e.g. `business-rule-guide`, `atf-guide`), or a tag keyword (e.g. `flow`, `atf`, `email`). The SDK resolves by exact name first, then by tag.

> **v4.6.0 implementation note:** earlier versions of this tool created a hidden scaffold directory at `.explain-scaffold/` to satisfy SDK 4.5.0's project-context requirement. SDK 4.6.0 self-resolves documentation, so the scaffold layer has been removed; the legacy directory (if present from a prior install) is safe to delete.

## Resources

Standardized URI patterns following MCP specification:

| Resource Type | URI Pattern | Example | Purpose |
|---------------|-------------|---------|----------|
| **API Specs** | `sn-spec://{type}` | `sn-spec://business-rule` | API documentation and parameters |
| **Instructions** | `sn-instruct://{type}` | `sn-instruct://script-include` | Best practices and guidance |
| **Code Snippets** | `sn-snippet://{type}/{id}` | `sn-snippet://acl/0001` | Practical code examples |
| **Prompts** | `sn-prompt://{id}` | `sn-prompt://coding_in_fluent` | Development guides |

### Supported Metadata Types

57 metadata types across the following categories:

**Core Types:** `acl`, `application-menu`, `business-rule`, `client-script`, `cross-scope-privilege`, `form`, `import-set`, `instance-scan`, `list`, `property`, `role`, `scheduled-script`, `script-action`, `script-include`, `scripted-rest`, `sla`, `table`, `ui-action`, `ui-page`, `ui-policy`, `user-preference`

**Table Types:** `column`, `column-generic`

**Service Catalog:** `catalog-item`, `catalog-item-record-producer`, `catalog-ui-policy`, `catalog-client-script`, `catalog-variable`, `variable-set`

**Email:** `email-notification`, `inbound-email-action`

**Automation & Workflow:** `flow`, `custom-action`

**AI & Now Assist:** `ai-agent`, `ai-agent-workflow`, `now-assist-skill-config`

**Service Portal:** `service-portal`, `sp-header-footer`, `sp-page-route-map`

**Workspace & Analytics:** `workspace`, `dashboard`

**ATF (Automated Test Framework):** `atf-appnav`, `atf-catalog-action`, `atf-catalog-validation`, `atf-catalog-variable`, `atf-email`, `atf-form`, `atf-form-action`, `atf-form-declarative-action`, `atf-form-field`, `atf-form-sp`, `atf-reporting`, `atf-rest-api`, `atf-rest-assert-payload`, `atf-server`, `atf-server-catalog-item`, `atf-server-record`

### What's new in 4.6.0

This release of the MCP server tracks `@servicenow/sdk` 4.6.0 and adds support for the following Fluent APIs and SDK enhancements:

- **New metadata types**: `custom-action` (`sys_hub_action_type_definition`), `inbound-email-action` (`sys_email_action`), `sp-header-footer` (`sp_header_footer`), `sp-page-route-map` (`sp_page_route_map`).
- **Declarative Form API** — new form-configuration capability on the existing `Form` API.
- **Subflow-of-subflow** — Flows and Subflows can call other Subflows as steps.
- **Custom Actions in flows** — Reusable custom actions usable as steps inside Flows and Subflows; supports cross-scope references via SDK dependencies.
- **AIAF auto-ACL** — ACLs are automatically generated for `AiAgent` and `AiAgenticWorkflow` records at build time.
- **NASK enhancements** — Standard outputs (`response`, `provider`, `errorcode`, `status`, `error`) are auto-generated when `outputs` is omitted; expanded input types (`glide_record`, `simple_array`, `json_object`, `json_array`); optional `tableName` for `glide_record`; optional `truncate` flag for scalar types.
- **Table dictionary overrides** — The `Table` API directly supports `sys_dictionary_override` records.
- **ScheduledScript modules** — Script fields support modules.
- **`explain` command** — Tag-based topic search, `--list` topic index, `--peek` summaries, `--format=raw` markdown output. Now resolves docs without a Fluent project.

## Configuration

**Requirements:** Node.js 20.18.0+, npm 11.4.1+, `@servicenow/sdk` 4.6.0

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
        "SN_AUTH_TYPE": "basic",
        "SN_USER_NAME": "local-username",
        "SN_PASSWORD": "local-password"
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

| Variable | Description | Default |
|----------|-------------|---------|
| `SN_INSTANCE_URL` | ServiceNow instance URL for auto-auth validation | - |
| `SN_AUTH_TYPE` | Authentication method: `basic` or `oauth` | `oauth` |
| `SN_USER_NAME` | Username for basic auth (informational) | - |
| `SN_PASSWORD` | Password for basic auth (informational) | - |

> **Note:** The server automatically detects existing auth profiles matching `SN_INSTANCE_URL` at startup. If a matching profile is found, it's stored in the session and auto-injected into SDK commands. If no profile exists, you'll be prompted to run the auth command manually.

## Usage Examples

### Typical Workflow

1. **Initialize Project**

   ```text
   Create a new Fluent app in ~/projects/asset-tracker for IT asset management
   ```

2. **Develop with Resources**

   ```text
   Show me the business-rule API specification and provide an example snippet
   ```

3. **Build and Deploy**

   ```text
   Build the app with debug output, then deploy it
   ```

> **Note:** Authentication is automatically configured via environment variables (`SN_INSTANCE_URL`, `SN_AUTH_TYPE`). If you need to set up a new auth profile, run: `npx @servicenow/sdk auth --add <instance-url> --type <basic|oauth> --alias <alias>`

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
   - Verify response shows the SDK version (e.g., `4.6.0`)
4. **Test Help:**
   - Set `flag` parameter to `-h`
   - Set `command` parameter to `build`
   - Click **Execute**
   - Verify response shows build command documentation with options
5. Monitor **Notifications** pane for command execution logs

**Expected Results:**

- Version command returns SDK version string
- Help command returns detailed command documentation
- List metadata (`-lm`) returns available Fluent metadata types
- No errors in notifications pane
- Commands execute within 2-3 seconds

## License

MIT
