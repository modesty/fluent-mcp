# Instructions for Fluent Generic Column API

Always reference the Generic Column API and Table API specifications for more details.

1. Use `GenericColumn()` only when a specific typed column function is unavailable.
2. `columnType` is mandatory and must match a valid internal column type value.
3. Keep Generic Column option names aligned with the API spec (`attributes`, `dynamicValueDefinitions`, `functionDefinition`, etc.).
4. Prefer typed column APIs over `GenericColumn()` whenever they provide equivalent behavior.
5. Define generic columns inside the `schema` object of a `Table()` declaration.
