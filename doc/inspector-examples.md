# MCP Inspector Usage Examples for fluent-mcp

This guide describes the MCP Inspector 2.10.0 UI used to test the built fluent-mcp server. The live session negotiated MCP 2025-11-25; testing the newer protocol era separately remains necessary.

## Table of Contents
- [Getting Started](#getting-started)
- [Testing Tools](#testing-tools)
- [Testing Resources](#testing-resources)
- [Testing Prompts](#testing-prompts)
- [Environment Configuration](#environment-configuration)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Launch the Inspector

**Option 1: Test the built server**
```bash
npm run build && npm run inspect
```

**Option 2: Build and test the development bundle**
```bash
npm run inspect:dev
```

**Option 3: Test the published NPM package**
```bash
npm run inspect:published
```

### Initial Connection

1. Open the local Inspector URL printed in the terminal if the browser does not open automatically.
2. On **Servers**, find the `node` server. It initially appears disconnected.
3. Enable its connection switch and wait for the connected state.
4. Use the top navigation: **Servers**, **Tools**, **Prompts**, and **Resources**.
5. Use the right monitoring sidebar: **Console** displays server stderr; **Protocol** displays JSON-RPC traffic. These are separate views, and Console entries do not imply MCP logging support.

## Testing Tools

### Example 1: Test sdk_info Tool

**Purpose:** Verify the server can access ServiceNow SDK information

**Steps:**
1. Navigate to the **Tools** tab
2. Find `sdk_info` in the tools list
3. Select the tool to display its parameter form; use **Edit as JSON** when a JSON input is easier
4. Set the `flag` parameter to `-v` (for version)
5. Click **Execute Tool**
6. Inspect **Results** and verify the output shows the ServiceNow SDK version

**Expected Output:**
```
ServiceNow SDK Version Information:

4.13.6
```

### Example 2: Test check_auth_status Tool

**Purpose:** Verify lazy authentication validation and its structured status output

**Steps:**
1. Navigate to the **Tools** tab
2. Find `check_auth_status` in the tools list
3. Take no parameters — the tool accepts none
4. Click **Execute Tool**
5. Verify the response reports whether a credential alias was resolved for `SN_INSTANCE_URL`

**Expected Output:** a `structuredContent` payload describing the configured instance and
whether a matching auth profile was found. With no `SN_INSTANCE_URL` set, the tool reports
that no instance is configured and names the remedy rather than failing.

**Notes:**
- Authentication is validated lazily, on first need; `tools/list` never triggers it.
- There is no `manage_fluent_auth` tool. `AuthCommand` is used internally for lazy
  auto-auth validation but is deliberately not exposed over MCP.

### Example 3: Test build_fluent_app Tool

**Purpose:** Test building a Fluent application

**Steps:**
1. Navigate to the **Tools** tab
2. Find `build_fluent_app` in the tools list
3. Set parameters:
   - `workingDirectory`: the absolute path to a disposable Fluent project
   - `debug`: `true` (optional)
4. Click **Execute Tool**
5. Check the output for build results

**Notes:**
- This command requires a valid Fluent project directory
- If no working directory is set, you'll get an error message
- Inspect **Results** for the build outcome and **Console** for server stderr

## Testing Resources

### Example 4: Browse API Specifications

**Purpose:** View Fluent API documentation for metadata types

**Steps:**
1. Navigate to the **Resources** tab
2. Look for resources with URI pattern `sn-spec://{metadataType}`
3. Click on `sn-spec://business-rule`
4. The content pane shows the full API specification

**What to Verify:**
- Resource loads successfully
- Content is properly formatted Markdown
- MIME type is `text/markdown`
- API methods and parameters are documented

### Example 5: View Code Snippets

**Purpose:** Access practical code examples

**Steps:**
1. Navigate to the **Resources** tab
2. Find resources with URI pattern `sn-snippet://{metadataType}/{id}`
3. Click on `sn-snippet://acl/0001`
4. Review the example code

**What to Verify:**
- Snippet loads correctly
- Code is formatted and readable
- Example demonstrates the metadata type usage

### Example 6: Access Instructions

**Purpose:** View development guidance for metadata types

**Steps:**
1. Navigate to the **Resources** tab
2. Find `sn-instruct://table`
3. Click to view the content
4. Review the instructions for creating tables

**What to Verify:**
- Instructions are comprehensive
- Best practices are included
- Content is relevant to the metadata type

### Example 7: Access the Coding Guide

**Purpose:** Access the development guide through the prompt interface

**Steps:**
1. Navigate to **Prompts**
2. Select `coding_in_fluent`
3. Click **Get Prompt**
4. Review the returned messages, following [Example 8](#example-8-view-available-prompts)

The Resources view exposes `sn-spec://`, `sn-instruct://`, and `sn-snippet://` URIs. Prompt content is available through **Prompts**, not a resource URI.

## Testing Prompts

### Example 8: View Available Prompts

**Purpose:** List all prompt templates

**Steps:**
1. Navigate to the **Prompts** tab
2. View the list of available prompts
3. Click on a prompt to see its details
4. For `coding_in_fluent`, leave the optional `metadata_list` argument empty, or supply metadata types to tailor the prompt
5. Click **Get Prompt**
6. Inspect the returned messages and their text content

**What to Verify:**
- All prompts are listed
- Each prompt has a clear description
- Arguments are properly defined
- **Get Prompt** returns non-empty messages for each listed prompt

## Environment Configuration

### Example 9: Configure ServiceNow Instance

**Purpose:** Test with a specific ServiceNow instance configuration

**Steps:**
1. Close the Inspector if running
2. Set environment variables and launch:
```bash
SN_INSTANCE_URL=https://dev12345.service-now.com \
SN_AUTH_TYPE=oauth \
npm run inspect
```
3. Connect the server on **Servers** and inspect **Console** for initialization messages
4. Verify the environment variables are recognized

**What to Verify:**
- Server starts with environment variables
- `check_auth_status` performs lazy authentication validation when requested
- Instance tools have the required credential alias before a real instance operation is tested

### Example 10: Test with Different Environments

**Purpose:** Test against dev, test, and prod environments

**Dev Environment:**
```bash
SN_INSTANCE_URL=https://dev12345.service-now.com SN_AUTH_TYPE=basic npm run inspect
```

**Test Environment:**
```bash
SN_INSTANCE_URL=https://test12345.service-now.com SN_AUTH_TYPE=oauth npm run inspect
```

**Production Environment:**
```bash
SN_INSTANCE_URL=https://company.service-now.com SN_AUTH_TYPE=oauth npm run inspect
```

## Common Workflows

### Workflow 1: Verify a New Command

**Scenario:** You've added a new command and want to test it

1. **Code the command:**
   - Create new command class in `src/tools/commands/`
   - Register in `CommandFactory.createCommands()`

2. **Build:**
   ```bash
   npm run build
   ```

3. **Launch Inspector:**
   ```bash
   npm run inspect
   ```

4. **Verify in Tools tab:**
   - Find your new command
   - Check the schema/parameters
   - Execute with test inputs

5. **Monitor:**
   - Inspect **Results**, **Console**, and **Protocol** for errors
   - Verify output format
   - Test edge cases

### Workflow 2: Debug Resource Loading

**Scenario:** You've added a new resource file and it's not loading

1. **Add resource file:**
   - Place in appropriate `res/` subdirectory
   - Follow naming convention

2. **Launch Inspector (dev mode):**
   ```bash
   npm run inspect:dev
   ```

3. **Check Resources tab:**
   - Look for your resource URI
   - Attempt to load the resource

4. **Debug:**
   - Check **Console** for server errors and **Protocol** for failed resource reads
   - Verify file path is correct
   - Ensure naming matches convention

5. **Fix and reload:**
   - Make corrections
   - Restart Inspector
   - Verify resource appears

### Workflow 3: Test Working Directory Resolution

**Scenario:** Verify commands correctly resolve working directories

1. **Launch Inspector:**
   ```bash
   npm run inspect
   ```

2. **Test without session:**
   - Execute `build_fluent_app`
   - Check error message about working directory

3. **Verify the error:**
   - Check **Results** for an actionable error naming `workingDirectory` and `FLUENT_MCP_WORKING_DIR`
   - Confirm the server does not silently use its own installation directory

4. **Supply a directory:**
   - Set the tool's `workingDirectory` argument to an absolute Fluent project path and execute again
   - Alternatively, restart with `FLUENT_MCP_WORKING_DIR` set before launching Inspector
   - Resolution is per-call argument → session → configuration → error; MCP Roots are not used

### Workflow 4: Validate All Capabilities

**Scenario:** Comprehensive server validation before release

1. **Launch Inspector:**
   ```bash
   npm run build && npm run inspect
   ```

2. **Check Tools (17 tools: 13 SDK commands and four resource/authentication tools):**
   - build_fluent_app
   - check_auth_status
   - cicd_fluent_app
   - cicd_fluent_test
   - clean_fluent_app
   - deploy_fluent_app
   - download_fluent_app
   - download_fluent_dependencies
   - explain_fluent_api
   - fluent_transform
   - get-api-spec
   - get-instruct
   - get-snippet
   - init_fluent_app
   - pack_fluent_app
   - query_fluent_records
   - sdk_info

   Note: authentication is handled lazily from environment variables and is surfaced
   through `check_auth_status`; there is no `manage_fluent_auth` tool.

3. **Check Resources and Prompts:**
   - The tested build lists 224 resource URIs and zero resource templates
   - Read every listed URI and verify non-empty `text/markdown` content
   - Check API specifications, instructions, and snippets
   - On **Prompts**, use **Get Prompt** for every listed prompt and inspect the messages

4. **Execute smoke tests:**
   - Run `sdk_info` with `-v` flag
   - Exercise each resource tool and local SDK command using a disposable Fluent project
   - Verify invalid arguments return actionable errors
   - Use `check_auth_status` to establish whether live instance testing is available
   - Without a configured `SN_INSTANCE_URL`, validation guards for `deploy_fluent_app`, `download_fluent_app`, `query_fluent_records`, `cicd_fluent_app`, and `cicd_fluent_test` do not establish successful instance operations

5. **Monitor performance:**
   - Check response times
   - Look for timeout issues
   - Inspect terminal and **Console** output for runtime errors; a short UI test alone does not establish memory stability

## Troubleshooting

### Issue: Inspector won't connect

**Symptoms:**
- Browser opens but shows "Connecting..." indefinitely
- No tools or resources appear

**Solutions:**
1. Verify the build is current: `npm run build`
2. Check for TypeScript errors: `npm run lint`
3. Review server logs in terminal for errors
4. Try dev mode instead: `npm run inspect:dev`

### Issue: Tools show but won't execute

**Symptoms:**
- Tools appear in the list
- Execution results in timeout or error

**Solutions:**
1. Check command requires working directory (session-aware commands)
2. Verify environment variables are set if needed
3. Inspect **Results** and **Console** for detailed error messages
4. Test the bundled SDK through `sdk_info` with `flag: "-v"`

### Issue: Resources not appearing

**Symptoms:**
- Resources tab is empty or incomplete
- Specific resources missing

**Solutions:**
1. Verify resource files exist in `res/` directory
2. Check file naming follows convention
3. Ensure `ResourceLoader` initialized correctly
4. Look for initialization errors in **Console**

### Issue: Environment variables not working

**Symptoms:**
- Set environment variables but server doesn't recognize them

**Solutions:**
1. Verify syntax: `VAR=value npm run inspect` (no spaces around `=`)
2. Check server logs in **Console**
3. Try setting in shell first: `export VAR=value`, then `npm run inspect`
4. Verify the server code reads the environment variable

### Issue: Changes not reflected

**Symptoms:**
- Made code changes but Inspector shows old behavior

**Solutions:**
1. Always rebuild: `npm run build` before `npm run inspect`
2. Completely close Inspector and restart
3. Clear browser cache if needed
4. Verify build succeeded without errors

## Advanced Usage

### Custom Working Directory

Project-aware tools expose `workingDirectory` in their input schema. Set it in the parameter form or **Edit as JSON**:

```json
{
  "workingDirectory": "/absolute/path/to/disposable-fluent-project"
}
```

For a default shared by project-aware calls, launch with:

```bash
FLUENT_MCP_WORKING_DIR=/absolute/path/to/disposable-fluent-project npm run inspect
```

The path must be absolute, non-empty, and different from the filesystem root. Neither the Inspector connection nor the server's current directory supplies a project implicitly.

### Batch Testing with Scripts

A launch script can print a manual checklist; it does not execute or verify the checks itself:

```bash
#!/bin/bash
# test-with-inspector.sh
set -e

npm run build

echo "Inspector checklist:"
echo "1. Connect the node server"
echo "2. Verify all 17 tools are present"
echo "3. Execute sdk_info with flag -v"
echo "4. Read resources and get prompts"
echo "5. Review Results, Console, and Protocol for errors"

npm run inspect
```

### Integration with CI/CD

The interactive Inspector launch is not a CI assertion. An automated check must connect a client, execute requests, assert the returned results, and stop the processes. Keep protocol tests and the repository's native test suite in CI; use the Inspector to verify the UI against the built artifact.

## Best Practices

1. **Always rebuild** before testing changes: `npm run build`
2. **Monitor Results, Console, and Protocol** - distinguish tool results, server stderr, and JSON-RPC traffic
3. **Test incrementally** - verify each change before moving on
4. **Use dev mode** to build and inspect the development bundle
5. **Document test cases** - keep a checklist of scenarios to verify
6. **Test error cases** - try invalid inputs to verify error handling
7. **Check all tabs** - Tools, Resources, Prompts all provide unique insights

## Additional Resources

- [MCP Inspector Documentation](https://modelcontextprotocol.io/docs/tools/inspector)
- [fluent-mcp README](../README.md)
- [fluent-mcp AGENTS.md](../AGENTS.md)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io)
