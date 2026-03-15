# Instructions for Fluent Column API

Always reference the Column API and Table API specifications for more details.

1. Define typed columns inside the `schema` object of a `Table()` declaration.
2. Import only the column functions you use from `@servicenow/sdk/core`.
3. Use Fluent column option names exactly as specified (for example `maxLength`, `readOnly`, `mandatory`, `attributes`).
4. For SDK 4.2+ column helpers, use `Duration()`, `Time()`, `FieldList()`, and `TemplateValue()` with matching column types.
5. Use `Now.attach('path/to/image.png')` only for image-compatible defaults such as `BasicImageColumn`.
