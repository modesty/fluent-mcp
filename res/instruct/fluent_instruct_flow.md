# Instructions for Fluent Flow API
Always reference the Flow API specification for more details.
1. Import `Flow`, `wfa`, `trigger`, and `action` from `@servicenow/sdk/automation` — NOT from `@servicenow/sdk/core`.
2. Every `$id` value — in the flow config, trigger instance, and every `wfa.action()` / `wfa.flowLogic.*` call — must use `Now.ID['unique_key']` with a descriptive, unique key. Duplicate `$id` values within a flow cause build errors.
3. The flow body callback is the third argument to `Flow()`. All `wfa.action()` and `wfa.flowLogic.*` calls must be placed inside this callback, not outside it.
4. `wfa.trigger()` takes three arguments: the built-in trigger definition (e.g., `trigger.record.created`), a trigger instance config object with `$id`, and the trigger inputs object. The trigger inputs vary by trigger type — always specify at least `table` for record triggers.
5. Use `wfa.dataPill(value, type)` to reference output values from triggers or previous actions. The second argument specifies the data type: `'string'`, `'reference'`, `'integer'`, `'boolean'`, `'array.string'`, etc. Mismatched types cause runtime errors.
6. `wfa.flowLogic.if()`, `elseIf()`, and `else()` form a logical group. `elseIf` and `else` must immediately follow the `if` block without intervening action calls.
7. `wfa.flowLogic.forEach()` iterates over an array data pill. Use `wfa.flowLogic.exitLoop()` or `wfa.flowLogic.skipIteration()` inside the loop body when needed.
8. MVP limitations (SDK 4.3.0): try/catch error handling, step rewind (Go-Back-To), and DateTime flow variables are not yet supported. Use `StringColumn` as a workaround for DateTime flow variables. SubFlow support was added in SDK v4.5.0.
9. Flow variables declared in `flowVariables` within the config object are accessible via `params.flowVariables` in the body, fully typed. Use `wfa.flowLogic.setFlowVariables()` to update them at runtime.
10. `runAs` defaults to `'system'` since SDK v4.5.0 (previously defaulted to `'user'`). With `'system'`, the flow runs under the system context (no user-specific restrictions). Use `runAs: 'user'` when the flow should respect the triggering user's permissions.
11. Service Catalog trigger and catalog actions (`getCatalogVariables`, `createCatalogTask`, `submitCatalogItemRequest`) require SDK 4.4.0 or later.
12. The `protection: 'read'` option makes the flow read-protected (cannot be directly edited on the instance). Omit or use `''` for no protection.
13. **SDK v4.5.0**: Flows and subflows are now auto-published during `install` by default. Use the `--skip-flow-activation` flag on the install command to disable this behavior.
