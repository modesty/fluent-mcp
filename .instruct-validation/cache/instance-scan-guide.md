
# Instance Scan Guide

Create ServiceNow Instance Scan checks using Fluent API. Covers all scan check types: `TableCheck`, `LinterCheck`, `ColumnTypeCheck`, and `ScriptOnlyCheck`. Instance scan checks evaluate an instance for upgradability, performance, security, manageability, and user experience issues. Supported in SDK 4.0.0 or higher.

## When to Use

- Creating instance scan checks for health or compliance evaluation
- Choosing between TableCheck, LinterCheck, ColumnTypeCheck, or ScriptOnlyCheck
- Writing server-side scan scripts for advanced checks
- Configuring scoring, run conditions, or metadata for checks

## Instructions

1. **Import:** `import { TableCheck, LinterCheck, ColumnTypeCheck, ScriptOnlyCheck } from '@servicenow/sdk/core'`
2. **Unique $id:** Every check requires a unique `$id` in `Now.ID[<value>]` format. Use descriptive kebab-case values.
3. **Never use `scan_check` directly:** Always use one of the four scan types.
4. **camelCase properties:** Use `shortDescription`, `resolutionDetails`, `columnType`, `scoreMin`, `scoreMax`, `scoreScale`, `runCondition`, `findingType`, `useManifest`, `documentationUrl`.
5. **Scripts:** Always use inline scripts. Do not use `Now.include()` or external files.
6. **File organization:** Place `.now.ts` definitions in `src/fluent/scan-checks/`.
7. **ES5 scripts:** Server-side scripts must use `Class.create()` or plain functions. Do not use ES6 class syntax.
8. **Resolution details:** Always provide `resolutionDetails` so findings are actionable.

## Check Type Selection

| Use Case | Check Type | Key Property |
|----------|-----------|-------------|
| Scan records in a table by condition only | TableCheck | `conditions` (encoded query) |
| Filter records then evaluate with script | TableCheck | `conditions` + `advanced: true` + `script` |
| Lint code across the instance | LinterCheck | (base properties only) |
| Scan columns of a content type | ColumnTypeCheck | `columnType: 'script' \| 'xml' \| 'html'` |
| Standalone script check, no table binding | ScriptOnlyCheck | `script` (inline) |
| Scope findings to upgrade changes | TableCheck | `useManifest: true` |

### Decision Tree

1. "Scan records in a table where every match is a finding" -- **TableCheck** with `conditions`
2. "Filter records then evaluate each with custom logic" -- **TableCheck** with `conditions` + `advanced: true` + `script`
3. "Lint code for bad patterns" -- **LinterCheck**
4. "Scan all script/XML/HTML columns" -- **ColumnTypeCheck** with `columnType`
5. "Run a standalone check with no table binding" -- **ScriptOnlyCheck** with `script`
6. "Only check records changed during upgrades" -- **TableCheck** with `useManifest: true`

### Decision Matrix by Category

| Category | Recommended Check Types | Example |
|----------|------------------------|---------|
| security | ColumnTypeCheck (script) + ScriptOnlyCheck | Scan scripts for hardcoded credentials |
| upgradability | TableCheck + LinterCheck | Find deprecated API usage |
| performance | TableCheck (conditions) + ColumnTypeCheck | Find large attachments |
| manageability | ScriptOnlyCheck + TableCheck | Detect orphaned records |
| user_experience | LinterCheck + ColumnTypeCheck (html) | Lint for accessibility |

## API Reference

For the full property reference, see the `tablecheck-api`, `lintercheck-api`, `columntypecheck-api`, and `scriptonlycheck-api` topics.

### How Conditions and Scripts Work Together (TableCheck)

| Aspect | Condition-Only Mode | Advanced Mode |
|--------|-------------------|---------------|
| **When to use** | Every matching record is a finding | Need custom logic per record |
| **Configuration** | `conditions: 'encoded_query'` | `conditions` + `advanced: true` + `script` |
| **Script required** | No | Yes |
| **Flow** | conditions -- all matches = findings | conditions -- filter -- script per record -- `finding.increment()` |

## Scripting Patterns

### Script Signatures by Check Type

| Check Type | Signature | Key Objects |
|-----------|-----------|-------------|
| TableCheck (advanced) | `(function(engine, current) {...})(engine, current)` | `engine.finding`, `current` (filtered record) |
| ScriptOnlyCheck | `(function(finding) {...})(finding)` or `(function(engine) {...})(engine)` | `finding` / `engine.finding` |
| ColumnTypeCheck | `(function(engine, current, columnValue) {...})(engine, current, columnValue)` | `engine.finding`, `current`, `columnValue` |
| LinterCheck | `(function(engine) {...})(engine)` | `engine.finding`, `engine.rootNode` (AST root) |

### Finding API

| Method | Description |
|--------|-------------|
| `engine.finding.increment()` | Register a finding |
| `engine.finding.setCurrentSource(record)` | Set the source GlideRecord |
| `engine.finding.setValue('finding_details', '...')` | Add descriptive text |
| `engine.finding.setValue('count', number)` | Set the finding count |

### LinterCheck Engine API

| Property / Method | Description |
|-------------------|-------------|
| `engine.rootNode` | The AST root node |
| `engine.rootNode.visit(callback)` | Walk the AST tree |
| `node.getTypeName()` | AST node type (`"NAME"`, `"CALL"`, `"FUNCTION"`) |
| `node.getNameIdentifier()` | Identifier name for NAME nodes |
| `node.getParent()` | Parent AST node |
| `node.getLineNo()` | Line number (0-based) |

### ES5 Compatibility

| ES6 (avoid) | ES5 (use instead) |
|-------------|-------------------|
| `class Foo {}` | `var Foo = Class.create(); Foo.prototype = {...}` |
| `const` / `let` | `var` |
| Arrow functions | `function() {}` |
| Template literals | `'string ' + x` |
| `for...of` | `for (var i = 0; ...)` |

## Scoring Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `scoreMin` | `0` | Minimum findings before scoring applies |
| `scoreMax` | `100` | Maximum findings for scoring |
| `scoreScale` | `1` | Multiplier applied to finding count |

**High-impact security check:** `scoreMin: 0, scoreMax: 50, scoreScale: 5`

**Low-impact informational check:** `scoreMin: 10, scoreMax: 500, scoreScale: 1`

## Metadata

Control when checks are installed using `$meta.installMethod`:

```javascript
$meta: { installMethod: "demo" }       // Installed with "Load demo data"
$meta: { installMethod: "first install" } // Installed only on first app install
```

Omit `$meta` for checks that should always be installed.

## Avoidance

- Never use the `scan_check` table directly
- Never set `advanced: true` on TableCheck without providing a `script`
- Never confuse `conditions` (TableCheck record filter) with `runCondition` (execution gate for all types)
- Never use ES6 class syntax in server-side scripts
- Never use `Now.include()` or external script files
- Never omit `$id`
- Never hard-code sys_ids without documenting their source

## Examples

### Condition-Based TableCheck

```javascript
import { TableCheck } from "@servicenow/sdk/core";

export const inactiveUsersWithRoles = TableCheck({
  $id: Now.ID["check-inactive-users-roles"],
  name: "Inactive Users with Roles",
  active: true,
  category: "security",
  priority: "2",
  shortDescription: "Finds inactive users that still have active role assignments",
  table: "sys_user",
  conditions: "active=false^roles!=",
  resolutionDetails: "Remove role assignments from inactive user accounts."
});
```

### Advanced Script-Based TableCheck

```javascript
import { TableCheck } from "@servicenow/sdk/core";

export const largeAttachmentCheck = TableCheck({
  $id: Now.ID["check-large-attachments"],
  name: "Large Attachment Detector",
  active: true,
  category: "performance",
  priority: "3",
  shortDescription: "Identifies oversized attachments that impact performance",
  table: "sys_attachment",
  advanced: true,
  script: `(function(engine, current) {
    var size = parseInt(current.getValue('size_bytes'), 10);
    if (size > 10485760) {
        engine.finding.setCurrentSource(current);
        engine.finding.increment();
    }
})(engine, current);`,
  resolutionDetails: "Review large attachments and move to external storage.",
  useManifest: true
});
```

### ScriptOnlyCheck

```javascript
import { ScriptOnlyCheck } from "@servicenow/sdk/core";

export const adminRoleAudit = ScriptOnlyCheck({
  $id: Now.ID["check-admin-ratio"],
  name: "Admin Role Ratio Check",
  active: true,
  category: "security",
  priority: "1",
  shortDescription: "Flags if admin users exceed 5% of total active users",
  script: `(function(finding) {
    var gr = new GlideRecord('sys_user_has_role');
    gr.addQuery('role.name', 'admin');
    gr.addQuery('user.active', true);
    gr.query();
    var adminCount = gr.getRowCount();

    var ga = new GlideAggregate('sys_user');
    ga.addQuery('active', true);
    ga.addAggregate('COUNT');
    ga.query();
    ga.next();
    var total = parseInt(ga.getAggregate('COUNT'), 10);

    if (total > 0 && (adminCount / total) > 0.05) {
        finding.increment();
    }
})(finding);`,
  resolutionDetails: "Review admin role assignments and reduce to minimum necessary."
});
```

### LinterCheck

```javascript
import { LinterCheck } from "@servicenow/sdk/core";

export const evalUsageCheck = LinterCheck({
  $id: Now.ID["check-eval-usage"],
  name: "Eval Usage Detector",
  active: true,
  category: "security",
  priority: "1",
  shortDescription: "Detects usage of eval() in scripts",
  script: `(function(engine) {
    var line_numbers = [];
    engine.rootNode.visit(function(node) {
        if (node.getTypeName() === 'NAME' &&
            node.getNameIdentifier() === 'eval' &&
            node.getParent().getTypeName() === 'CALL') {
            line_numbers.push(node.getLineNo() + 1);
        }
    });
    if (line_numbers.length == 0) return;
    engine.finding.setValue('finding_details', 'Found on lines: ' + line_numbers.join(', '));
    engine.finding.setValue('count', line_numbers.length);
    engine.finding.increment();
})(engine);`,
  resolutionDetails: "Replace eval() with safer alternatives."
});
```

### ColumnTypeCheck

```javascript
import { ColumnTypeCheck } from "@servicenow/sdk/core";

export const scriptPatternCheck = ColumnTypeCheck({
  $id: Now.ID["check-script-pattern"],
  name: "Dangerous Script Pattern Detector",
  active: true,
  category: "security",
  priority: "2",
  shortDescription: "Scans script columns for dangerous patterns",
  columnType: "script",
  script: `(function(engine, current, columnValue) {
    var skip_tables = ['sys_script_execution_history', 'scan_column_type_check'];
    if (current.getTableName && skip_tables.indexOf(current.getTableName()) > -1) return;

    var search_regex = /PATTERN_TO_FIND/;
    if (!search_regex.test(columnValue)) return;

    var comments_regex = /\\/\\*[\\s\\S]*?\\*\\/|([^:]|^)\\/\\/.*$/gm;
    var clean = columnValue.replace(comments_regex, '');
    if (clean.length == columnValue.length || search_regex.test(clean))
        engine.finding.increment();
})(engine, current, columnValue);`,
  resolutionDetails: "Review and remediate flagged script patterns."
});
```

