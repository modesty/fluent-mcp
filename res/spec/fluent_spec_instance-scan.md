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
  category: '', // ScanCategory, mandatory - category: 'upgradability' | 'performance' | 'security' | 'manageability' | 'user_experience'
  script: '', // string, optional - server-side script for custom linting logic using Instance Scan API
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
  priority: '1', // ScanPriority, mandatory - '1' (Critical) | '2' (High) | '3' (Moderate) | '4' (Low)
  shortDescription: '', // string, mandatory - brief description of the check
  resolutionDetails: '', // string, optional - guidance for resolving findings
  documentationUrl: '', // string, optional - link to documentation
  scoreMin: 0, // number, optional - minimum score
  scoreMax: 0, // number, optional - maximum score
  scoreScale: 0, // number, optional - score scale
  runCondition: '', // string, optional - condition for when to run the check
  findingType: '', // string, optional - type of finding
  advanced: false, // boolean, optional - enable advanced mode
  useManifest: false, // boolean, optional - whether to use manifest
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
  category: '', // ScanCategory, mandatory - category: 'upgradability' | 'performance' | 'security' | 'manageability' | 'user_experience'
  script: '', // string, mandatory - server-side script that runs the check logic
    // The script should use the Instance Scan API to report findings
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
  priority: '1', // ScanPriority, mandatory - '1' (Critical) | '2' (High) | '3' (Moderate) | '4' (Low)
  shortDescription: '', // string, mandatory - brief description of the check
  resolutionDetails: '', // string, optional - guidance for resolving findings
  documentationUrl: '', // string, optional - link to documentation
  scoreMin: 0, // number, optional - minimum score
  scoreMax: 0, // number, optional - maximum score
  scoreScale: 0, // number, optional - score scale
  runCondition: '', // string, optional - condition for when to run the check
  findingType: '', // string, optional - type of finding
  advanced: false, // boolean, optional - enable advanced mode
  useManifest: false, // boolean, optional - whether to use manifest
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
  category: '', // ScanCategory, mandatory - category: 'upgradability' | 'performance' | 'security' | 'manageability' | 'user_experience'
  columnType: '', // ColumnType, mandatory - the column type to validate: 'script' | 'xml' | 'html'
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
  priority: '1', // ScanPriority, mandatory - '1' (Critical) | '2' (High) | '3' (Moderate) | '4' (Low)
  shortDescription: '', // string, mandatory - brief description of the check
  resolutionDetails: '', // string, optional - guidance for resolving findings
  documentationUrl: '', // string, optional - link to documentation
  scoreMin: 0, // number, optional - minimum score
  scoreMax: 0, // number, optional - maximum score
  scoreScale: 0, // number, optional - score scale
  runCondition: '', // string, optional - condition for when to run the check
  findingType: '', // string, optional - type of finding
  advanced: false, // boolean, optional - enable advanced mode
  useManifest: false, // boolean, optional - whether to use manifest
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
  category: '', // ScanCategory, mandatory - category: 'upgradability' | 'performance' | 'security' | 'manageability' | 'user_experience'
  table: '', // string, mandatory - target table for the check
  conditions: '', // string, optional - encoded query condition to match tables
  protectionPolicy: '', // 'read' | 'protected', optional - protection level for this check
  priority: '1', // ScanPriority, mandatory - '1' (Critical) | '2' (High) | '3' (Moderate) | '4' (Low)
  shortDescription: '', // string, mandatory - brief description of the check
  resolutionDetails: '', // string, optional - guidance for resolving findings
  documentationUrl: '', // string, optional - link to documentation
  scoreMin: 0, // number, optional - minimum score
  scoreMax: 0, // number, optional - maximum score
  scoreScale: 0, // number, optional - score scale
  runCondition: '', // string, optional - condition for when to run the check
  findingType: '', // string, optional - type of finding
  advanced: false, // boolean, optional - enable advanced mode
  useManifest: false, // boolean, optional - whether to use manifest
}): TableCheck
```
