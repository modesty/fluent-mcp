# Instructions for Fluent CatalogItemRecordProducer API
Always reference the CatalogItemRecordProducer API specification for more details.
1. `table` is mandatory and must be a valid ServiceNow table name (e.g., `'incident'`, `'change_request'`, `'problem'`). This is the table where a new record will be created on submission.
2. Use `script` for pre-insert logic — map catalog variable values to record fields using `producer.var_name` syntax (e.g., `current.short_description = producer.issue_title`). Do NOT call `current.update()` or `current.insert()` in the `script` property — the record is not yet saved at that point.
3. Use `postInsertScript` for post-insert logic where `current.update()` is safe to call. This runs after the record has been inserted.
4. Variable values are accessed in scripts via `producer.<variable_internal_name>`. The variable internal name is the key used in the `variables` object.
5. Set `requestMethod: 'submit'` (rather than the default `'order'`) for record producers — it sets a more appropriate label on the submit button.
6. Set `redirectUrl: 'generatedRecord'` (default) to take the user to the newly created record after submission. Use `'catalogHomePage'` to redirect to the catalog home instead.
7. Record producers do NOT use `flow`, `executionPlan`, or `workflow` for fulfillment — the record creation IS the fulfillment. These fields are not applicable to record producers.
8. All other `CatalogItem` properties (categories, availableFor, variableSets, etc.) apply equally — see the catalog-item instruct for those guidelines.
9. Export the record producer as a named constant so it can be referenced by `CatalogClientScript` and `CatalogUIPolicy` that apply specifically to record producers.
