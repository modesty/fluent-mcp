# Instructions for Fluent Instance Scan APIs
Always reference the Instance Scan API specifications for more details.
1. Import `LinterCheck`, `ScriptOnlyCheck`, `ColumnTypeCheck`, or `TableCheck` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`.
2. Choose the correct check type for your use case: `LinterCheck` for code pattern matching via linter rules, `ScriptOnlyCheck` for custom scripted evaluation logic, `ColumnTypeCheck` for validating columns of a specific type, and `TableCheck` for validating table-level configurations.
3. Every check requires a unique `name`. Use descriptive names that clearly convey what the check validates (e.g., "Detect hardcoded credentials in scripts").
4. Use the `category` field to organize checks into logical groups such as 'Performance', 'Security', 'Best Practice', 'Manageability', or 'Upgradability'.
5. For `LinterCheck`, the `findType` and `findPattern` fields are mandatory. The `findPattern` defines the pattern to search for, and `findType` specifies the matching engine to use.
6. For `ScriptOnlyCheck`, the `script` field is mandatory and should contain server-side JavaScript that uses the Instance Scan API to report findings. This is the most flexible check type for complex logic.
7. For `ColumnTypeCheck`, the `columnType` field is mandatory and specifies which column type to inspect (e.g., 'string', 'reference'). Use the `condition` field to narrow down which columns are checked.
8. For `TableCheck`, use the `condition` field to define an encoded query that matches the tables to validate. This check type operates at the table level rather than individual records.
9. Set `active: false` to disable a check without removing it. All checks default to active when not specified.
10. Use `protectionPolicy` to control whether the check can be modified: `'read'` allows read access only, and `'protected'` prevents modifications entirely.
