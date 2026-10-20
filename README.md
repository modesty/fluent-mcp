# Fluent MCP Server

An [MCP server](https://modelcontextprotocol.io) and AI skill suite that brings [ServiceNow Fluent SDK](https://www.servicenow.com/docs/bundle/yokohama-application-development/page/build/servicenow-sdk/concept/servicenow-fluent.html) (`@servicenow/sdk`) capabilities, API specifications, code snippets, and security reviews to AI-assisted development environments.

## Key Features

- **17 MCP Tools** — 13 ServiceNow SDK CLI command tools (`sdk_info`, `init`, `build`, `deploy`, `transform`, `dependencies`, `download`, `clean`, `pack`, `explain`, `query`, `cicd_fluent_app`, `cicd_fluent_test`) plus 4 resource/auth tools (`get-api-spec`, `get-snippet`, `get-instruct`, `check_auth_status`).
- **75 ServiceNow Metadata Types** — Packaged API specs (`sn-spec://`), authoring instructions (`sn-instruct://`), runnable snippets (`sn-snippet://`), and workflow prompts (`coding_in_fluent`, `create_custom_ui`).
- **AI Agent Skills** — Built-in skills (`fluent-cli`, `fluent-security-review`, `fluent-general-review`, and `fluent-domain-separation-review`) installable as a plugin for Claude Code, Codex, Copilot, and other skill-enabled agents.
- **Lazy Auto-Authentication** — Resolves and caches an SDK auth profile matching `SN_INSTANCE_URL` on first use.
- **Explicit Working Directory Resolution** — Resolves project paths in strict order: `workingDirectory` argument → session (`init_fluent_app`) → `FLUENT_MCP_WORKING_DIR` → actionable error. Never guesses from `process.cwd()`.
- **Dual-Era MCP Protocol** — Serves both current and legacy MCP protocol revisions over stdio from a single handler set, with zero server-initiated requests.

---

## MCP Setup

**Requirements:** Node.js `>=22.23.2` and npm `>=10.9.8`.

Add `@modesty/fluent-mcp` to your MCP client configuration:

```json
{
  "mcpServers": {
    "fluent-mcp": {
      "command": "npx",
      "args": ["-y", "@modesty/fluent-mcp"],
      "env": {
        "FLUENT_MCP_WORKING_DIR": "/absolute/path/to/your/fluent-project",
        "SN_INSTANCE_URL": "https://your-instance.service-now.com",
        "SN_AUTH_TYPE": "oauth"
      }
    }
  }
}
```

**Client Config Locations:**
- **Claude Desktop (macOS):** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Code CLI:** `claude mcp add fluent-mcp -- npx -y @modesty/fluent-mcp`
- **VS Code Copilot:** `.vscode/mcp.json` (uses `"mcp": { "servers": { ... } }` instead of `"mcpServers"`)
- **Cursor / Windsurf / Gemini CLI:** Add under `mcpServers` in your client's MCP settings file

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLUENT_MCP_WORKING_DIR` | Fallback absolute path to your Fluent project | — |
| `SN_INSTANCE_URL` | ServiceNow instance URL for automatic auth profile lookup | — |
| `SN_AUTH_TYPE` | `oauth` or `basic` | `oauth` |
| `SN_USER_NAME` / `SN_PASSWORD` | Basic auth credentials for non-interactive profile creation | — |
| `FLUENT_MCP_LOG_LEVEL` | Minimum stderr log level (`debug`, `info`, `notice`, `warning`, `error`) | `info` |
| `FLUENT_MCP_COMMAND_TIMEOUT_MS` | Operator override for CLI command timeout (ms) | Per-tool |
| `NO_TELEMETRY` | Set to `1` to disable `@servicenow/sdk` CLI telemetry | — |

> **Authentication Tip:** To register an instance profile manually, run:
> `npx @servicenow/sdk auth --add <instance-url> --type <basic|oauth> --alias <alias>`
> For headless CI/CD pipelines, set `SN_SDK_NODE_ENV=SN_SDK_CI_INSTALL` along with `SN_SDK_INSTANCE_URL` and `SN_SDK_USER`/`SN_SDK_USER_PWD` or `SN_SDK_OAUTH_CLIENT_ID`/`SN_SDK_OAUTH_CLIENT_SECRET`.

### MCPB Bundle (Optional)

Run `npm run bundle` to build a self-contained `fluent-mcp-<version>.mcpb` archive with `dist/`, `res/`, and production dependencies for MCPB-compatible desktop hosts.

---

## Skills (`fluent-skillset`)

This repository ships standalone AI agent skills under [`skills/`](./skills) packaged as the `fluent-skillset` plugin.

### Skill Plugin Installation

| Agent / Tool | Installation |
|---|---|
| **Claude Code** | Run `/plugin marketplace add modesty/fluent-mcp`, then `/plugin install fluent-skillset@modesty` and `/reload-plugins` |
| **GitHub Copilot** | Run `gh skill install modesty/fluent-mcp <skill-name>` (add `--scope user` for `~/.copilot/skills/`), then `/skills reload` |
| **Codex** | Run `$skill-installer https://github.com/modesty/fluent-mcp/tree/main/skills/<skill-name>`, then restart Codex |
| **Cursor** | Settings (`Cmd+Shift+J`) → **Plugins** → paste `https://github.com/modesty/fluent-mcp.git` → **Add to Cursor** |
| **Grok** | Run `grok plugin marketplace add modesty/fluent-mcp` and `grok plugin install fluent-skillset --trust` |
| **Windsurf / Other Agents** | Prompt the agent: `Please install these skills in my user level configuration from github: https://github.com/modesty/fluent-mcp/tree/main/skills` (or copy `skills/*` into `~/.claude/skills/` or `~/.agents/skills/`) |

### Available Skills & Intended Usage

| Skill | Intended Usage |
|-------|----------------|
| **[`fluent-cli`](./skills/fluent-cli/SKILLS.md)** | **Fluent App Development & Live Instance Queries (No MCP Required).** Guides the agent through `npx @servicenow/sdk` CLI workflows directly via bash: project orientation (`now.config.json`), progressive documentation lookup (`explain --list` → `--peek` → full topic), building/transforming metadata, and querying live ServiceNow tables (`query <table> -q '<encoded-query>' -o json`). Ideal for lightweight CLI environments where the MCP server is not attached. |
| **[`fluent-security-review`](./skills/fluent-security-review/SKILLS.md)** | **ServiceNow App Security Review.** Audits **both** Fluent (`now.config.json` with `src/` and `metadata/`) and classic ServiceNow XML (`update/`, `unload/`) applications, organized by risk level ([Critical (7)](./skills/fluent-security-review/references/critical_risk_checks.md), [High (26)](./skills/fluent-security-review/references/high_risk_checks.md), [Medium (12)](./skills/fluent-security-review/references/medium_risk_checks.md), [Low (1)](./skills/fluent-security-review/references/low_risk_checks.md)) and backed by a deterministic scanner script ([`scan_security_checks.mjs`](./skills/fluent-security-review/scripts/scan_security_checks.mjs)). Produces a structured Markdown report with **Exemplary Practices**, prioritized **Findings** (`P0`–`P4`) with actionable fixes, and a final **PASS / FAIL** security review conclusion. |
| **[`fluent-general-review`](./skills/fluent-general-review/SKILLS.md)** | **ServiceNow App General Best-Practice Review.** Audits **both** Fluent (`now.config.json`) and classic ServiceNow XML (`update/`) applications against all **31 ServiceNow general best-practice checks** across [Scripting (15 checks)](./skills/fluent-general-review/references/scripting_checks.md) and [Configuration (16 checks)](./skills/fluent-general-review/references/config_checks.md), backed by a deterministic scanner script ([`scan_general_checks.mjs`](./skills/fluent-general-review/scripts/scan_general_checks.mjs)). |
| **[`fluent-domain-separation-review`](./skills/fluent-domain-separation-review/SKILLS.md)** | **ServiceNow App Domain Separation / MSP Readiness Review.** Specifically for apps targeting **MSP Ready (Domain Separation)** certification on the ServiceNow Store. Audits Fluent and classic XML apps against all **10 MSP & Domain Separation checks** ([`msp_checks.md`](./skills/fluent-domain-separation-review/references/msp_checks.md)), backed by a deterministic scanner script ([`scan_msp_checks.mjs`](./skills/fluent-domain-separation-review/scripts/scan_msp_checks.mjs)). |

---

## Available Tools (17)

### SDK Command Tools (13)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `sdk_info` | Get SDK version (`-v`) or command help (`-h`) | `flag`, `command` |
| `explain_fluent_api` | Look up Fluent SDK docs for any API class, guide, or tag (no project required) | `topic`, `list`, `peek`, `format` (`pretty`\|`raw`), `source`, `debug` |
| `init_fluent_app` | Initialize a new Fluent app or convert an existing app (non-interactive) | `workingDirectory`, `intent`, `appName`, `packageName`, `scopeName`, `template`, `from`, `auth`, `debug` |
| `build_fluent_app` | Build the Fluent application package | `workingDirectory`, `debug` |
| `deploy_fluent_app` | Deploy/install the built package to a ServiceNow instance | `workingDirectory`, `auth`, `skipFlowActivation`, `async`, `debug` |
| `fluent_transform` | Transform local XML or instance records into Fluent `.now.ts` source code | `workingDirectory`, `from`, `directory`, `table`, `id`, `force`, `format`, `timeoutSeconds`, `auth`, `debug` |
| `download_fluent_dependencies` | Download application dependencies and script/table type definitions | `workingDirectory`, `auth`, `debug` |
| `download_fluent_app` | Download application metadata from an instance | `workingDirectory`, `directory`, `source`, `incremental`, `timeoutSeconds`, `auth`, `debug` |
| `clean_fluent_app` | Clean build output directory | `workingDirectory`, `source`, `debug` |
| `pack_fluent_app` | Zip built application into an installable artifact | `workingDirectory`, `source`, `debug` |
| `query_fluent_records` | Read-only Table REST query against an instance (returns JSON envelope) | `workingDirectory`, `table`, `query`, `fields`, `limit`, `offset`, `displayValue`, `select`, `timeout`, `auth` |
| `cicd_fluent_app` | Install, publish, or rollback an app via the `sn_cicd` API | `workingDirectory`, `action` (`install`\|`publish`\|`rollback`), `scope`\|`appSysId`, `appVersion`, `wait`, `pollTimeout`, `output`, `select` |
| `cicd_fluent_test` | Run, watch, or fetch results/logs for ATF test suites and tests via `sn_cicd` | `target` (`testsuite`\|`test`), `action` (`run`\|`watch`\|`result`\|`logs`), `testSuiteSysId`\|`testSuiteName`, `testSysId`\|`testName`, `progressId`, `resultId`, `pattern`, `limit`, `wait`, `output`, `select` |

### Resource & Authentication Tools (4)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get-api-spec` | Get the Fluent API specification for a metadata type (omit to list all 75 types) | `metadataType` (optional) |
| `get-snippet` | Get runnable Fluent code snippets for a metadata type | `metadataType`, `id` (optional) |
| `get-instruct` | Get authoring rules, conventions, and pitfalls for a metadata type | `metadataType` |
| `check_auth_status` | Validate and return the current ServiceNow instance authentication status | None |

---

## Resources & Prompts

| Type | URI / Name | Purpose |
|------|------------|---------|
| **API Specs** | `sn-spec://{metadataType}` | TypeScript API signatures and field schemas |
| **Instructions** | `sn-instruct://{metadataType}` | Best practices, constraints, and common pitfalls |
| **Code Snippets** | `sn-snippet://{metadataType}/{id}` | Practical, build-validated code examples |
| **Prompts** | `coding_in_fluent`, `create_custom_ui` | End-to-end authoring and custom UI guides |

### Supported Metadata Types (75)

- **Core (25):** `acl`, `application-menu`, `business-rule`, `client-script`, `cross-scope-privilege`, `data-policy`, `field-style`, `form`, `import-set`, `instance-scan`, `interceptor`, `list`, `property`, `role`, `scheduled-script`, `script-action`, `script-include`, `scripted-rest`, `sla`, `state-model`, `table`, `ui-action`, `ui-page`, `ui-policy`, `user-preference`
- **Table & View (3):** `column`, `column-generic`, `database-view`
- **Service Catalog (6):** `catalog-item`, `catalog-item-record-producer`, `catalog-ui-policy`, `catalog-client-script`, `catalog-variable`, `variable-set`
- **Email (2):** `email-notification`, `inbound-email-action`
- **Automation & Workflow (3):** `flow`, `custom-action`, `playbook`
- **Integration & Connections (6):** `alias`, `alias-template`, `retry-policy`, `rest-message`, `data-lookup`, `graphql-api`
- **AI & Now Assist (3):** `ai-agent`, `ai-agent-workflow`, `now-assist-skill-config`
- **Service Portal (3):** `service-portal`, `sp-header-footer`, `sp-page-route-map`
- **Workspace & Analytics (2):** `workspace`, `dashboard`
- **Assessments (2):** `assessment`, `risk-assessment`
- **ATF & Testing (20):** `atf`, `atf-appnav`, `atf-catalog-action`, `atf-catalog-validation`, `atf-catalog-variable`, `atf-email`, `atf-form`, `atf-form-action`, `atf-form-declarative-action`, `atf-form-field`, `atf-form-sp`, `atf-list`, `atf-reporting`, `atf-rest-api`, `atf-rest-assert-payload`, `atf-server`, `atf-server-catalog-item`, `atf-server-record`, `atf-ui-test-script`, `test-suite`

---

## Development

```bash
npm ci                        # Install dependencies
npm run build                 # Build production bundle to dist/
npm run dev                   # Build development bundle and start server
npm test                      # Run full test suite (node:test)
npm run lint                  # Lint TypeScript sources
npm run typecheck             # Type-check src/ and test/ (npm run typecheck:test)
npm run validate:specs        # Validate res/spec/*.md against SDK types
npm run validate:instructs    # Validate res/instruct/*.md against SDK explain corpus
npm run validate:snippets     # Compile all res/snippet/*.md via now-sdk build
npm run inspect               # Launch MCP Inspector against dist/index.js
npm run bundle                # Package self-contained .mcpb bundle
```

## License

MIT
