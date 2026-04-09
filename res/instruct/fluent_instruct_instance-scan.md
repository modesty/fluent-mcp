# Instructions for Fluent Instance Scan APIs
Always reference the Instance Scan API specifications for more details.
1. Import `LinterCheck`, `ScriptOnlyCheck`, `ColumnTypeCheck`, or `TableCheck` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`.
2. Choose the correct check type for your use case: `LinterCheck` for code pattern matching via linter rules, `ScriptOnlyCheck` for custom scripted evaluation logic, `ColumnTypeCheck` for validating columns of a specific type, and `TableCheck` for validating table-level configurations.
3. Every check requires `name`, `category`, `priority`, and `shortDescription` as mandatory fields. Use descriptive names that clearly convey what the check validates.
4. The `category` field is mandatory and classifies checks: `'upgradability'`, `'performance'`, `'security'`, `'manageability'`, or `'user_experience'`. The `priority` field is mandatory and uses string values: `'1'` (Critical), `'2'` (High), `'3'` (Moderate), `'4'` (Low).
5. For `LinterCheck`, use the `script` field to define custom linting logic via the Instance Scan API. LinterCheck has no additional properties beyond the common base.
6. For `ScriptOnlyCheck`, the `script` field is mandatory and should contain server-side JavaScript that uses the Instance Scan API to report findings. This is the most flexible check type for complex logic.
7. For `ColumnTypeCheck`, the `columnType` field is mandatory and specifies which column type to inspect: `'script'`, `'xml'`, or `'html'`.
8. For `TableCheck`, the `table` field is mandatory. Use the `conditions` field (plural) to define an encoded query that matches records in that table. Use `advanced: true` with `script` for custom evaluation logic.
9. Set `active: false` to disable a check without removing it. All checks default to active when not specified.
10. Use `protectionPolicy` to control whether the check can be modified: `'read'` allows read access only, and `'protected'` prevents modifications entirely.
11. Use `shortDescription` for a brief summary and `resolutionDetails` to provide guidance on how to fix findings. Both are shown to users in scan results.
12. Use `documentationUrl` to link to detailed documentation about the check and its findings.
13. Use the scoring fields (`scoreMin`, `scoreMax`, `scoreScale`) to assign severity scores to findings for prioritization.
14. Use `runCondition` to control when the check executes, and `findingType` to classify the type of findings produced.
