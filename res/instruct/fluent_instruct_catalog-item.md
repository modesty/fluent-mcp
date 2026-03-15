# Instructions for Fluent CatalogItem API
Always reference the CatalogItem API specification for more details.
1. `name` is the only mandatory property. At minimum, also provide `shortDescription` and at least one catalog via `catalogs` to make the item discoverable.
2. Categories can only be specified when `catalogs` is also provided. Attempting to set `categories` without `catalogs` will cause a build error.
3. For fulfillment, provide exactly one of `flow`, `executionPlan`, or `workflow`. Providing more than one is mutually exclusive and will cause a build error.
4. Variables can be defined inline in the `variables` object (key = internal variable name, value = a variable function call from the catalog-variable spec), or attached as reusable sets via `variableSets`. Both can be used together — the returned object's `variables` property merges all variables for type-safe referencing.
5. When using `variableSets`, always assign the `VariableSet` to a named export before referencing it in `CatalogItem`. This allows `CatalogUiPolicy` and `CatalogClientScript` to reference specific variable names via dot notation on the variable set's `variables` property.
6. `mandatoryAttachment: true` and `hideAttachment: true` are mutually exclusive — setting both will cause a build error.
7. `requestMethod` controls the label on the order button: `'order'` → "Order Now", `'request'` → "Request", `'submit'` → "Submit".
8. Export `CatalogItem` as a named constant to enable referencing by `CatalogUIPolicy`, `CatalogClientScript`, and Flows.
9. Use `availableFor` and `notAvailableFor` with `user_criteria` sys_ids to control who can see and order the item.
10. The `roles` property restricts who can view the item (based on user role), while `availableFor` controls ordering eligibility via user criteria.
