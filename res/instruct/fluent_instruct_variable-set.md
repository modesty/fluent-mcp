# Instructions for Fluent VariableSet API
Always reference the VariableSet API specification for more details.
1. `title` is mandatory. It is the display heading shown above the variable group on the catalog form when `displayTitle: true`.
2. Always assign a `VariableSet` to an **exported named constant** — e.g., `export const myVariableSet = VariableSet({...})`. This is essential for `CatalogUiPolicy` and `CatalogClientScript` to reference specific variables via `myVariableSet.variables.varName`.
3. Variable internal names (the keys in `variables`) are what `g_form.getValue('name')` and `producer.name` use in client scripts and record producer scripts. Choose clear, snake_case names.
4. Attach a variable set to a `CatalogItem` or `CatalogItemRecordProducer` via the `variableSets` array: `variableSets: [{ variableSet: myVarSet, order: 100 }]`. The `order` controls where the variable set appears relative to other variable sets and inline variables on the form.
5. A `VariableSet` can be shared across multiple catalog items — define it once and reference it from many items. This ensures consistent data collection and allows `CatalogUiPolicy` to apply to it universally.
6. The `type: 'multiRow'` allows users to add multiple rows of variables (like a table), useful for collecting repeating data (e.g., multiple software licenses). The default `'singleRow'` presents variables once.
7. `layout: '2across'` displays variables in two columns, `'2down'` stacks them in two tall columns. `'normal'` uses a single-column full-width layout.
8. `readRoles`, `writeRoles`, and `createRoles` restrict access to the variable set itself in the system. These are distinct from the variable `readRoles`/`writeRoles` which control field-level access per variable.
9. See the catalog-variable spec for all available variable types and their specific configuration options.
