# Instructions for Fluent Business Rule API
Always reference the Business Rule API specifications for more details.
1. The `when` field is used to specify when the business rule should be executed. The only valid values for `when` are: before, after, async, async_deprecated, display.
2. The `action` field is used to specify the CRUD operations that the business rule applies to. The only valid values for `action` are: insert, update, delete, query.
3. The `addMessage` field indicates whether or not to display a message on the UI when the business rule runs. `addMessage` === `true` means a message will be displayed.
4. The `condition` and `filterCondition` must be valid ServiceNow encoded query strings.
5. For Business Rule updates, do not modify the `script` property unless explicitly specified.
6. The `priority` field sets the execution priority for async business rules. Higher values run first.
7. Set `clientCallable: true` to allow client-side scripts to invoke this business rule.
8. Use the `rest` object for REST integration: `webService` enables REST calls, `service`/`method` reference REST message definitions.
9. Use `access` to control scope: `'public'` allows all scopes, `'package_private'` restricts to current scope.
10. Use `protectionPolicy` to control modifications: `'read'` allows viewing but not editing, `'protected'` prevents all changes.
11. **When NOT to use a Business Rule (SDK v4.10.1 guidance).** A Business Rule is the wrong tool for state-machine behavior — prefer the declarative, platform-enforced, auditable mechanism instead:
    - **Blocking, reverting, or gating a state transition** → use a **State Model** (see the `state-model` spec). A rule whose core logic is `current.state.setValue(previous.state)` or a state-gated `current.setAbortAction(true)` is a State Model in disguise. Recognize requirements like "prevent records from being cancelled/reopened after state X", "block backward transitions", or "records can only move forward" as State Model work.
    - **Making fields mandatory based on state** → use a `DataPolicy` (or `UiPolicy`); if the field is required only to complete one specific transition, use a State Model `'Mandatory Fields'` transition condition instead.
    - **Controlling which state values are selectable** → define the valid transitions out of each state in a State Model rather than scripting the allowed values.
    - **Pre-populating `assignment_group` on a task-inherited table** → use Assignment Rules (`sysrule_assignment`), which model `order`/`condition`/`match_conditions`/`group` as data.
    - **Deterministic field-value mapping** ("given this combination of values, set these others") → use `DataLookup` (`dl_definition`) so the mapping is maintainable as records rather than script.
12. Setting `message` alone no longer implies a message will be shown: the build stopped inferring `add_message` from the `message` field, so set `addMessage: true` explicitly whenever you want the message displayed.
