# Instructions for Fluent CatalogUiPolicy API
Always reference the CatalogUiPolicy API specification for more details.
1. Provide either `catalogItem` or `variableSet` as the target — these are mutually exclusive. Use `catalogItem` when the policy applies to the whole catalog item form; use `variableSet` when the policy applies within a specific variable set.
2. `catalogCondition` uses JavaScript expression syntax with variable references. Access variable values by referencing the variable set's `variables` property: e.g., `${myVariableSet.variables.is_urgent} === true`. Do not use ServiceNow encoded query format here — this is client-side JavaScript.
3. Set `reverseIfFalse: true` to automatically undo the actions when the condition becomes false. Without this, action changes persist even after the condition is no longer true.
4. `appliesOnCatalogItemView: true` is the most common setting — it applies the policy when the user is on the catalog item request form. Set `appliesOnRequestedItems: true` or `appliesOnCatalogTasks: true` to also apply the policy on those views.
5. Actions' `variableName` should reference the actual variable object (e.g., `myVariableSet.variables.department`) rather than a plain string name when possible — this provides type safety and avoids name typos.
6. Providing `visible: false` in an action hides the variable entirely. Use `mandatory: true` to require a value. A variable cannot be both `mandatory: true` and `hidden: true` (or `readOnly: true`).
7. For complex conditional logic, use `runScripts: true` with `executeIfTrue` and `executeIfFalse` JavaScript scripts, but prefer declarative `actions` when possible.
8. Multiple policies can target the same variable — they execute in `order` sequence (lower numbers first). Be careful about conflicting policies that might cancel each other out.
