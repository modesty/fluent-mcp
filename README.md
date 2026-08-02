# Fluent MCP Server

An [MCP server](https://modelcontextprotocol.io) that brings [ServiceNow Fluent SDK](https://www.servicenow.com/docs/bundle/yokohama-application-development/page/build/servicenow-sdk/concept/servicenow-fluent.html) capabilities to AI-assisted development environments. Enables natural language interaction with ServiceNow SDK commands, API specifications, code snippets, and development resources.

Built for [@servicenow/sdk@v4.9.0](https://github.com/ServiceNow/sdk/releases#release-v4.9.0) and [MCP@v2026-7-28](https://modelcontextprotocol.io/specification/2026-07-28). Compatible with Node.js 20.18.0+ and npm 11.4.1+.

## Key Features

- **SDK Command Tools** - `sdk_info` plus ServiceNow SDK command tools for `init`, `build`, `install`, `dependencies`, `transform`, `download`, `clean`, `pack`, `explain`, and `query`
- **Rich Resources** - API specifications, instructions, and code snippets for **65 ServiceNow metadata types**
- **API Documentation Lookup** - `explain_fluent_api` returns SDK docs for any Fluent API or guide — no project required
- **Lazy Auto-Authentication** - Detects and caches an auth profile only when an auth-requiring command or `check_auth_status` needs it
- **Explicit Project Context** - Resolves each project command from its `workingDirectory` argument, the initialized session, or `FLUENT_MCP_WORKING_DIR`, then fails with actionable guidance instead of guessing
- **Client-Friendly Schemas** - Optional inputs advertise their canonical value types while the enforced schema accepts `null` as an omitted-value compatibility form

This MCP server implements the [Model Context Protocol](https://modelcontextprotocol.io) specification with the following capabilities:

### Core

- **Resources** - 300+ resources across 65 ServiceNow metadata types (API specs, instructions, snippets, prompts)
- **Tools** - 11 ServiceNow SDK command tools plus 4 resource/auth tools (15 total), with full parameter validation. Read tools (`get-api-spec`, `get-snippet`, `get-instruct`, `check_auth_status`) declare an `outputSchema` and return `structuredContent` for programmatic consumers
- **Prompts** - Development workflow templates for common ServiceNow tasks (`coding_in_fluent`, `create_custom_ui`)
- **Logging & Progress** - Structured logs are written to stderr; progress notifications are sent for long-running commands (any command with a 30s or longer timeout — deploy, build, transform, download, dependencies, query, pack) when the client supplies a progress token

### Project Context & Sessions

The server requires **no client capabilities** and issues **no server→client requests**: Roots, Sampling, and Elicitation are not used (MCP 2026-07-28 removed server-initiated requests, and all input arrives with the `tools/call` arguments).

- **Session Management** - Tracks the directory established by `init_fluent_app` for subsequent project commands
- **Working Directory Resolution** - `workingDirectory` tool argument → initialized session → `FLUENT_MCP_WORKING_DIR` → actionable failure. Accepted paths are non-empty absolute paths other than the filesystem root. The server never guesses from its process cwd or installed package directory.
- **Non-interactive `init_fluent_app`** - Intent-specific arguments must be supplied with the call (creation: `appName`, `packageName`, `scopeName`, `template`; conversion: `from`); a missing argument fails with an error naming exactly what is absent
- **Error Handling** - Comprehensive error messages with actionable guidance
- **Type Safety** - Full TypeScript implementation with strict typing

### Protocol Behavior

- Dual-era stdio: a 2026-07-28 opening (per-request `_meta` envelope, `server/discover`) and a 2025-11-25 `initialize` are both served from the same handler set; the SDK entry point pins one era per connection.
- The six cacheable results of 2026-07-28 (`tools/list`, `prompts/list`, `resources/list`, `resources/templates/list`, `resources/read`, `server/discover`) advertise `ttlMs: 3600000` / `cacheScope: 'public'` — everything they return is static for the process lifetime.
- The server advertises instructions during initialization; `tools/list` is a side-effect-free read that returns tools in deterministic name order.
- Optional tool arguments advertise their canonical JSON types so clients render normal form fields. The enforced call schema additionally accepts `null` as an omitted value; `workingDirectory` also treats an empty string as omitted before applying the fallback chain.
- Structured logs go to stderr, keeping stdout reserved for MCP protocol traffic. Runtime `logging/setLevel` and `notifications/message` are not used.
- Resource misses use the standard JSON-RPC invalid-params code (`-32602`).

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

### SDK Command Tools (11)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `sdk_info` | Get SDK version or help | `flag` (-v/-h), `command` (optional for -h) |
| `explain_fluent_api` | Look up Fluent SDK documentation for any API or guide. No Fluent project required. | `topic` (optional API/guide name or tag keyword — required unless `list=true`), `list` (boolean — list topics), `peek` (boolean — brief summary), `format` (`pretty`\|`raw`), `source` (optional project path override), `debug` (optional) |
| `init_fluent_app` | Initialize or convert a ServiceNow app. Non-interactive: missing intent-specific arguments fail with an error naming them. | `intent`, `from` (conversion), `appName`/`packageName`/`scopeName`/`template` (creation), `auth`, `workingDirectory` (required), `debug` |
| `build_fluent_app` | Build the application | `workingDirectory`, `debug` (optional) |
| `deploy_fluent_app` | Deploy to a ServiceNow instance. SDK flow activation can be skipped. | `workingDirectory`, `auth` (auto-injected), `skipFlowActivation`, `debug` |
| `fluent_transform` | Convert XML or instance metadata to Fluent TypeScript. Local paths do not require auth; instance transforms do. | `workingDirectory`, `from`, `directory`, `auth` (auto-injected), `table`, `id`, `debug` |
| `download_fluent_dependencies` | Download dependencies and type definitions | `workingDirectory`, `auth` (auto-injected), `debug` |
| `download_fluent_app` | Download metadata from an instance | `workingDirectory`, `directory` (required), `source`, `auth` (auto-injected), `incremental`, `debug` |
| `clean_fluent_app` | Clean output directory | `workingDirectory`, `source` (optional), `debug` |
| `pack_fluent_app` | Create an installable artifact | `workingDirectory`, `source` (optional), `debug` |
| `query_fluent_records` | Read-only Table REST query against an instance; returns a JSON envelope | `workingDirectory`, `table` (required), `query` (required encoded query), `fields`, `limit`, `offset`, `displayValue`, `view`, `queryCategory`, `excludeReferenceLink`, `noCount`, `queryNoDomain`, `timeout`, `auth` (auto-injected), `debug` |

### Resource and Authentication Tools (4)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get-api-spec` | Get an API specification or list all available metadata types | `metadataType` (optional; omit to list all) |
| `get-snippet` | Get a Fluent code snippet; without `id`, returns the first available snippet and any additional snippet IDs | `metadataType` (required), `id` (optional) |
| `get-instruct` | Get authoring guidance, conventions, and common pitfalls for a metadata type | `metadataType` (required) |
| `check_auth_status` | Lazily validate configured ServiceNow authentication and return structured status information | No arguments |

> **Note:** Authentication is validated lazily on the first auth-requiring command or `check_auth_status`, then cached for the session. Use `init_fluent_app` to establish project context, pass `workingDirectory` per call, or set `FLUENT_MCP_WORKING_DIR`. Any optional argument sent as `null` is treated as omitted; `workingDirectory` also treats an empty string as omitted and falls through to the next source.

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

## Resources

Standardized URI patterns following MCP specification:

| Resource Type | URI Pattern | Example | Purpose |
|---------------|-------------|---------|----------|
| **API Specs** | `sn-spec://{type}` | `sn-spec://business-rule` | API documentation and parameters |
| **Instructions** | `sn-instruct://{type}` | `sn-instruct://script-include` | Best practices and guidance |
| **Code Snippets** | `sn-snippet://{type}/{id}` | `sn-snippet://acl/0001` | Practical code examples |
| **Prompts** | `sn-prompt://{id}` | `sn-prompt://coding_in_fluent` | Development guides |

### Supported Metadata Types

65 metadata types across the following categories:

**Core Types:** `acl`, `application-menu`, `business-rule`, `client-script`, `cross-scope-privilege`, `data-policy`, `form`, `import-set`, `instance-scan`, `list`, `property`, `role`, `scheduled-script`, `script-action`, `script-include`, `scripted-rest`, `sla`, `table`, `ui-action`, `ui-page`, `ui-policy`, `user-preference`

**Table Types:** `column`, `column-generic`

**Service Catalog:** `catalog-item`, `catalog-item-record-producer`, `catalog-ui-policy`, `catalog-client-script`, `catalog-variable`, `variable-set`

**Email:** `email-notification`, `inbound-email-action`

**Automation & Workflow:** `flow`, `custom-action`, `playbook`

**Integration & Connections:** `alias`, `alias-template`, `retry-policy`, `rest-message`, `data-lookup`

**AI & Now Assist:** `ai-agent`, `ai-agent-workflow`, `now-assist-skill-config`

**Service Portal:** `service-portal`, `sp-header-footer`, `sp-page-route-map`

**Workspace & Analytics:** `workspace`, `dashboard`

**ATF (Automated Test Framework):** `atf-appnav`, `atf-catalog-action`, `atf-catalog-validation`, `atf-catalog-variable`, `atf-email`, `atf-form`, `atf-form-action`, `atf-form-declarative-action`, `atf-form-field`, `atf-form-sp`, `atf-reporting`, `atf-rest-api`, `atf-rest-assert-payload`, `atf-server`, `atf-server-catalog-item`, `atf-server-record`, `atf-ui-test-script`

### What's new in 4.9.0

This release of the MCP server tracks `@servicenow/sdk` 4.9.0 — a maintenance and bug-fix release (Flow, ClientScript, ImportSet, SLA transform/build reliability) with select authoring-surface additions:

- **New metadata type**: `atf-ui-test-script` — the `atf.uiTestScript.runTest()` ATF step runs a TestingLibrary test body in the client test runner to test custom UI components (Angular/React widgets, embedded SPAs, custom workspaces, `now-*` web components) that the standard `atf.form.*` / `atf.catalog.*` steps cannot reach.
- **Multi-language choice labels** — a choice field's `choices` value may be an array of `ChoiceConfig` objects, each with a `language` (BCP 47) key, producing one translated `sys_choice` record per language.
- **`protectionPolicy` on AI Agent & AI Agentic Workflow** — `AiAgent` and `AiAgenticWorkflow` accept `protectionPolicy: 'read' | 'protected'` for post-install access control.
- **`Role.federatedId`** — optional identifier to match a role to an externally federated role during identity federation.
- **Table index platform columns** — a table `index` entry's `element` may reference platform default columns (for example, `sys_created_on`).
- **Now Assist Skill Kit providers** — new LLM providers selectable by name: `Now LLM LTS Generic`, `Google Cloud Vertex AI`, `Amazon Bedrock`.

> Source-of-truth note: two release-note claims are not corroborated by the installed package and were treated as corrections — Form `table_field.field` is documented as a schema column name (not loosened to "any string"), and the four named NASK model strings appear nowhere in the package (`model` is a free string). See `.mosey/upgrade-sdk-4.9.0.md`.

### Previously (4.8.x)

This release of the MCP server tracks `@servicenow/sdk` 4.8.0 and adds support for the following Fluent APIs and SDK enhancements:

- **New metadata type**: `playbook` — the `PlaybookDefinition` API (`sys_pd_process_definition`, from `@servicenow/sdk/automation`) for guided, record-driven multi-step processes with lanes, activities, triggers, and inputs/outputs.
- **New metadata type**: `rest-message` — the `RestMessage` API (`sys_rest_message`) for outbound HTTP integrations with shared auth/headers and callable functions.
- **New metadata types**: `alias` and `alias-template` — the `Alias` (`sys_alias`) and `AliasTemplate` (`sys_alias_templates`) APIs for Connection & Credential aliases and reusable connection-setup templates.
- **New metadata type**: `retry-policy` — the `RetryPolicy` API (`sys_retry_policy`) controlling transient-failure handling for connections (fixed-interval, exponential-backoff, or `Retry-After`).
- **New metadata type**: `data-lookup` — the `DataLookup` API (`dl_definition`) that auto-copies field values from a matcher table to a source record.
- **Declarative deletion (`Now.del()`)** — top-level statement to remove records by coalesce keys or sys_id.
- **Type enhancements** — `$override` on `DataPolicy`/`UserPreference`; `$meta.installMethod` on `Record`/`Acl`/`Alias`/`UserPreference`; ACL `field` accepts known field names, system columns, or `'*'`; `Table` `accessibleFrom` now defaults to `'public'`.
- **New CLI tool** — `query_fluent_records` wraps `now-sdk query` for read-only Table REST queries (JSON envelope output).

### Previously (4.7.x)

This release of the MCP server tracked `@servicenow/sdk` 4.7.x and added support for the following Fluent APIs and SDK enhancements:

- **New metadata type**: `data-policy` — the `DataPolicy` API (`sys_data_policy2`) for server-side mandatory/read-only field enforcement that cannot be bypassed via API, import, or web service.
- **Flow error handling & parallelism** — `wfa.flowLogic.tryCatch`, `wfa.flowLogic.doInParallel`, and `wfa.flowLogic.appendToFlowVariables` (append to `Array.Object` flow variables).
- **Flow stages** — declare `stages` with `FlowStage({ label, value, … })` and activate them in the body via `wfa.stage(...)` for progress tracking.
- **Table augments** — add columns to an existing platform/cross-scope table via `Table({ augments: '<table>', schema })`; added columns must use the current app's ownership prefix: `<scope>_` in a named custom scope (for example, `x_acme_`), or `u_` in global and Store-app contexts.
- **AI Agent** — new `agentDescriptor`; `dataAccess` accepts `roleMap` (role names) or `roleList` (role sys_ids).
- **NASK** — `securityControls` accepts `roleMap` (role names) alongside `roleRestrictions` (role sys_ids).
- **Universal field override (`$override`)** — escape hatch on Fluent constructors to set unmodeled columns by DB column name.
- **Protection policy** — `protectionPolicy` documented on `sys_policy`-backed APIs (Action, Subflow, business rules, scripted REST, etc.).
- **CLI** — `fluent_transform` gains `--table`/`--id` (transform by table hierarchy); `init` gains the `typescript.vue` template; OAuth `client_credentials` for CI/CD via `SN_SDK_*` env vars (see Configuration).
- **MCP** — read tools now return `structuredContent` (with declared `outputSchema`); long-running commands emit progress notifications.

### Previously (4.6.0)

Added `custom-action`, `inbound-email-action`, `sp-header-footer`, and `sp-page-route-map` metadata types; the declarative `Form` API; subflow-of-subflow and custom actions in flows; AIAF auto-ACL generation; NASK output/input-type enhancements; `Table` dictionary overrides; and a project-free `explain` command with tag search, `--list`, `--peek`, and `--format=raw`.

## Configuration

**Requirements:** Node.js 20.18.0+, npm 11.4.1+, `@servicenow/sdk` 4.9.0

### MCP Client Setup

Add to your MCP client configuration file:

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": ["-y", "@modesty/fluent-mcp"],
      "env": {
        "FLUENT_MCP_WORKING_DIR": "/absolute/path/to/your/fluent-project",
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
| `FLUENT_MCP_WORKING_DIR` | Absolute Fluent project path used after the per-call and initialized-session sources; when it is also absent, project commands fail with actionable guidance | - |
| `SN_INSTANCE_URL` | ServiceNow instance URL for auto-auth validation | - |
| `SN_AUTH_TYPE` | Authentication method: `basic` or `oauth` | `oauth` |
| `SN_USER_NAME` | Username for basic auth (informational) | - |
| `SN_PASSWORD` | Password for basic auth (informational) | - |
| `FLUENT_MCP_LOG_LEVEL` | Minimum stderr log severity (`debug`, `info`, `notice`, `warning`, `error`, etc.) | `info` |

> **Note:** On the first auth-requiring command (or `check_auth_status`), the server detects an existing auth profile matching `SN_INSTANCE_URL`, stores it in the session, and auto-injects it. Concurrent first calls share one validation promise. A new profile is added automatically only when setup can complete non-interactively (basic auth with `SN_USER_NAME`/`SN_USERNAME` + `SN_PASSWORD`); otherwise the server emits a single notice with the manual `auth --add` command to run.

#### Logging

The server writes its complete structured log stream to stderr so stdout remains reserved for MCP protocol traffic. Configure the minimum severity before launch with `FLUENT_MCP_LOG_LEVEL` (default `info`; use `debug` to include raw SDK CLI output). Runtime `logging/setLevel` and `notifications/message` are intentionally not used.

#### CI/CD (non-interactive) authentication — SDK v4.7.0+

For headless pipelines, the ServiceNow SDK CLI reads credentials directly from `SN_SDK_*` environment variables (the MCP server inherits and passes these through to spawned commands — no extra configuration needed). Set `SN_SDK_NODE_ENV=SN_SDK_CI_INSTALL` to enable CI mode, then:

| Variable | Required | Value |
|----------|----------|-------|
| `SN_SDK_NODE_ENV` | yes | `SN_SDK_CI_INSTALL` |
| `SN_SDK_AUTH_TYPE` | for oauth | `basic` (default) or `oauth` |
| `SN_SDK_INSTANCE_URL` | yes | Full instance URL |
| `SN_SDK_USER` / `SN_SDK_USER_PWD` | basic | Username / password |
| `SN_SDK_OAUTH_CLIENT_ID` / `SN_SDK_OAUTH_CLIENT_SECRET` | oauth | OAuth `client_credentials` app credentials |

OAuth uses the `client_credentials` grant against `/oauth_token.do`. See the SDK's `ci-integration` guide (via `explain_fluent_api`) for instance setup details.

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

> **Note:** Authentication is validated lazily using `SN_INSTANCE_URL` and `SN_AUTH_TYPE`; those settings do not replace an SDK auth profile unless non-interactive setup can complete. If you need to set up a new profile, run: `npx @servicenow/sdk auth --add <instance-url> --type <basic|oauth> --alias <alias>`

## Testing with MCP Inspector

The [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) provides a web interface for testing MCP servers.

### Launch Inspector

```bash
# Test published package
npx @modelcontextprotocol/inspector npx @modesty/fluent-mcp

# Or for local development (built server)
npm run build && npm run inspect

# Or against the TypeScript entry point, no build required
npm run inspect:dev
```

### What to verify

- The Tools tab shows all 15 tools in deterministic name order.
- Optional parameters render with their normal types rather than as nullable union forms.
- Structured server logs appear on the server process stderr/terminal output; stdout remains reserved for MCP protocol traffic.

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
   - Verify response shows the SDK version (e.g., `4.9.0`)
4. **Test Help:**
   - Set `flag` parameter to `-h`
   - Set `command` parameter to `build`
   - Click **Execute**
   - Verify response shows build command documentation with options
5. Monitor the server process **stderr/terminal output** for command execution logs (set `FLUENT_MCP_LOG_LEVEL=debug` before launch for verbose output)

**Expected Results:**

- Version command returns SDK version string
- Help command returns detailed command documentation
- List metadata (`-lm`) returns available Fluent metadata types
- No unexpected protocol errors; command logs are emitted on stderr rather than through MCP `notifications/message`
- Commands execute within 2-3 seconds

## License

MIT
