# MCP Inspector Usage Examples for fluent-mcp

This guide provides detailed examples and workflows for using the MCP Inspector to test and debug the fluent-mcp server.

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
npm run build
npm run inspect
```

**Option 2: Test during development (no build)**
```bash
npm run inspect:dev
```

**Option 3: Test the published NPM package**
```bash
npm run inspect:published
```

### Initial Connection

1. The Inspector opens a web browser automatically
2. You'll see the connection status in the Server Connection Pane
3. Wait for "Connected" status
4. The five capability tabs will become active: Resources, Prompts, Tools, Notifications

## Testing Tools

### Example 1: Test sdk_info Tool

**Purpose:** Verify the server can access ServiceNow SDK information

**Steps:**
1. Navigate to the **Tools** tab
2. Find `sdk_info` in the tools list
3. Click on the tool to expand its details
4. Set the `flag` parameter to `-v` (for version)
5. Click **Execute**
6. Verify the output shows the ServiceNow SDK version

**Expected Output:**
```
✅ Output:
@servicenow/sdk version: 4.0.2
```

### Example 2: Test manage_fluent_auth Tool

**Purpose:** Verify authentication management command generation

**Steps:**
1. Navigate to the **Tools** tab
2. Find `manage_fluent_auth` in the tools list
3. Set parameters:
   - `list`: `true`
4. Click **Execute**
5. Verify you get a command string (not actual execution, since it's interactive)

**Expected Output:**
```
✅ Output:
now-cli auth --list (in directory: /path/to/project)
```

### Example 3: Test build_fluent_app Tool

**Purpose:** Test building a Fluent application

**Steps:**
1. Navigate to the **Tools** tab
2. Find `build_fluent_app` in the tools list
3. Set parameters:
   - `debug`: `true` (optional)
4. Click **Execute**
5. Check the output for build results

**Notes:**
- This command requires a valid Fluent project directory
- If no working directory is set, you'll get an error message
- Monitor the Notifications pane for detailed logging

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

### Example 7: Test Prompts

**Purpose:** Access development guides and best practices

**Steps:**
1. Navigate to the **Resources** tab
2. Find `sn-prompt://coding_in_fluent`
3. Click to view the prompt content
4. Review the development guide

**What to Verify:**
- Prompt content loads successfully
- Guide provides actionable information
- Content follows MCP prompt format

## Testing Prompts

### Example 8: View Available Prompts

**Purpose:** List all prompt templates

**Steps:**
1. Navigate to the **Prompts** tab
2. View the list of available prompts
3. Click on a prompt to see its details
4. Review the prompt structure and arguments

**What to Verify:**
- All prompts are listed
- Each prompt has a clear description
- Arguments are properly defined

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
3. Check the **Notifications** pane for initialization messages
4. Verify the environment variables are recognized

**What to Verify:**
- Server starts with environment variables
- Auto-auth validation may trigger (if configured)
- No errors in notifications

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
   - Watch Notifications for errors
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
   - Check Notifications pane for errors
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

3. **Monitor notifications:**
   - Look for "No working directory found" messages
   - Verify fallback behavior logs

4. **Simulate with directory:**
   - Note: Inspector doesn't support init, but you can observe behavior
   - Check that root context is used as fallback

### Workflow 4: Validate All Capabilities

**Scenario:** Comprehensive server validation before release

1. **Launch Inspector:**
   ```bash
   npm run build
   npm run inspect
   ```

2. **Check Tools (should see 10 tools):**
   - sdk_info
   - manage_fluent_auth
   - init_fluent_app
   - build_fluent_app
   - deploy_fluent_app
   - fluent_transform
   - download_fluent_dependencies
   - download_fluent_app
   - clean_fluent_app
   - pack_fluent_app

3. **Check Resources:**
   - Verify all metadata types have specs
   - Spot-check snippets
   - Verify instructions load
   - Test prompts

4. **Execute smoke tests:**
   - Run `sdk_info` with `-v` flag
   - Test a few non-destructive commands
   - Verify error handling

5. **Monitor performance:**
   - Check response times
   - Look for timeout issues
   - Verify no memory leaks in notifications

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
3. Look at Notifications pane for detailed error messages
4. Test the underlying SDK is installed: `now-cli --version`

### Issue: Resources not appearing

**Symptoms:**
- Resources tab is empty or incomplete
- Specific resources missing

**Solutions:**
1. Verify resource files exist in `res/` directory
2. Check file naming follows convention
3. Ensure `ResourceLoader` initialized correctly
4. Look for initialization errors in Notifications

### Issue: Environment variables not working

**Symptoms:**
- Set environment variables but server doesn't recognize them

**Solutions:**
1. Verify syntax: `VAR=value npm run inspect` (no spaces around `=`)
2. Check server logs in Notifications pane
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

While the Inspector doesn't support setting working directories directly, you can:

1. Modify server code temporarily to set a default working directory
2. Use environment variables in your command implementations
3. Test working directory fallback behavior

### Batch Testing with Scripts

Create a test script to automate common checks:

```bash
#!/bin/bash
# test-with-inspector.sh

echo "Building project..."
npm run build

echo "Starting Inspector..."
npm run inspect

echo "Inspector should now be running. Test the following:"
echo "1. Verify all 10 tools are present"
echo "2. Execute sdk_info -v"
echo "3. Check resources load"
echo "4. Review notifications for errors"
```

### Integration with CI/CD

While Inspector is primarily interactive, you can use it in CI for smoke tests:

```yaml
# .github/workflows/inspector-test.yml
- name: Smoke test with Inspector
  run: |
    npm run build
    # Launch Inspector in background, run automated tests
    # (Requires headless browser setup)
```

## Best Practices

1. **Always rebuild** before testing changes: `npm run build`
2. **Monitor Notifications** - they contain valuable debugging info
3. **Test incrementally** - verify each change before moving on
4. **Use dev mode** for rapid iteration without rebuilding
5. **Document test cases** - keep a checklist of scenarios to verify
6. **Test error cases** - try invalid inputs to verify error handling
7. **Check all tabs** - Tools, Resources, Prompts all provide unique insights

## Additional Resources

- [MCP Inspector Documentation](https://modelcontextprotocol.io/docs/tools/inspector)
- [fluent-mcp README](../README.md)
- [fluent-mcp CLAUDE.md](../CLAUDE.md)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io)
