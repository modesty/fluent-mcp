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
