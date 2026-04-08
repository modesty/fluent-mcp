# **Context:** Instance Scan API spec: defines Instance Scan check configurations for detecting non-compliant or problematic configurations across a ServiceNow instance. Provides four check types: LinterCheck, ScriptOnlyCheck, ColumnTypeCheck, and TableCheck.

## LinterCheck API

Creates a Linter Check (`scan_linter_check`) that validates code patterns using a configurable linter engine. Linter checks inspect scripts across the platform for patterns that indicate issues, anti-patterns, or violations of coding standards.

```typescript
// Creates a new Linter Check (`scan_linter_check`)
LinterCheck({
  $id: '', // string | guid, mandatory - unique identifier for the check
  name: '', // string, mandatory - display name of the linter check
  description: '', // string, optional - description of what this check validates
  active: true, // boolean, optional - whether the check is active
  category: '', // string, optional - category for grouping related checks (e.g., 'Performance', 'Security', 'Best Practice')
  findType: '', // string, mandatory - the type of pattern to find (e.g., 'regex', 'ast')
  findPattern: '', // string, mandatory - the pattern or expression used to find matches
  failCondition: '', // string, optional - condition that determines when a match is considered a failure
  scriptLanguage: '', // string, optional - target script language (e.g., 'javascript', 'glide')
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
}): LinterCheck
```

## ScriptOnlyCheck API

Creates a Script Only Check (`scan_check_script_only`) that runs a custom server-side script to evaluate conditions and report findings programmatically. Use this when check logic is too complex for pattern-based matching.

```typescript
// Creates a new Script Only Check (`scan_check_script_only`)
ScriptOnlyCheck({
  $id: '', // string | guid, mandatory - unique identifier for the check
  name: '', // string, mandatory - display name of the script check
  description: '', // string, optional - description of what this check evaluates
  active: true, // boolean, optional - whether the check is active
  category: '', // string, optional - category for grouping related checks
  script: '', // string, mandatory - server-side script that runs the check logic
    // The script should use the Instance Scan API to report findings
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
}): ScriptOnlyCheck
```

## ColumnTypeCheck API

Creates a Column Type Check (`scan_check_column_type`) that validates columns of a specific type across tables in the instance. Useful for enforcing naming conventions, length constraints, or mandatory attributes on specific column types.

```typescript
// Creates a new Column Type Check (`scan_check_column_type`)
ColumnTypeCheck({
  $id: '', // string | guid, mandatory - unique identifier for the check
  name: '', // string, mandatory - display name of the column type check
  description: '', // string, optional - description of what this check validates
  active: true, // boolean, optional - whether the check is active
  category: '', // string, optional - category for grouping related checks
  columnType: '', // string, mandatory - the column type to validate (e.g., 'string', 'reference', 'integer')
  condition: '', // string, optional - encoded query condition to match columns of the specified type
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
}): ColumnTypeCheck
```

## TableCheck API

Creates a Table Check (`scan_check_table`) that validates table-level configurations across the instance. Use this to enforce standards on table properties, access controls, or structural requirements.

```typescript
// Creates a new Table Check (`scan_check_table`)
TableCheck({
  $id: '', // string | guid, mandatory - unique identifier for the check
  name: '', // string, mandatory - display name of the table check
  description: '', // string, optional - description of what this check validates
  active: true, // boolean, optional - whether the check is active
  category: '', // string, optional - category for grouping related checks
  condition: '', // string, optional - encoded query condition to match tables
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
}): TableCheck
```
