# Instructions for Fluent CatalogClientScript API
Always reference the CatalogClientScript API specification for more details.
1. `name` and `script` are both mandatory. The `script` property contains the raw JavaScript string that will run client-side.
2. The `type` property determines when the script fires:
   - `'onLoad'` — fires when the catalog form loads. Use for initializing field states.
   - `'onChange'` — fires when a specific variable value changes. Always pair with `variableName` to specify which variable triggers the script.
   - `'onSubmit'` — fires when the user clicks Submit. Return `false` from the function to prevent submission and display a validation error.
3. For `type: 'onChange'`, `variableName` must be set to the variable that triggers the script. Reference the actual variable object (e.g., `myVariableSet.variables.priority`) rather than a plain string for type safety.
4. Provide either `catalogItem` or `variableSet` as the target — these are mutually exclusive.
5. Catalog client scripts use `g_form` API (not `GlideForm` directly) — all variable access uses `g_form.getValue('var_name')`, `g_form.setValue('var_name', value)`, `g_form.setMandatory('var_name', true)`, etc. The variable name in `g_form` calls must match the variable's internal name (the key used in `variables`).
6. For `onSubmit` validation scripts, return `true` to allow submission and `false` to block it. Always `alert()` the reason for blocking so the user knows what to fix.
7. Set `appliesOnCatalogItemView: true` (the most common setting) to run the script on the catalog request form. Additional flags (`appliesOnRequestedItems`, `appliesOnCatalogTasks`, `appliesOnTargetRecord`) extend where the script runs.
8. Set `vaSupported: true` only if the script logic is compatible with Virtual Agent catalog flows. Many DOM-based operations do not work in VA context.
