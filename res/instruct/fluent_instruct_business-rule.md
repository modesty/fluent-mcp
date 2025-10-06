# Instructions for Fluent Business Rule API
Always reference the Business Rule API specifications for more details.
1. The `when` field is used to specify when the business rule should be executed. The only valid values for `when` are: before, after, async, display.
2. The `action` field is used to specify the CRUD operations that the business rule applies to. The only valid values for `action` are: insert, update, delete, query.
3. The `addMessage` field indicates whether or not to display a message on the UI when the business rule runs. `addMessage` === `true` means a message will be displayed.
4. The `condition` and `filterCondition` must be valid ServiceNow encoded query strings.
5. For Business Rule updates, do not modify the `script` property unless explicitly specified.
