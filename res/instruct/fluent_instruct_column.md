# Instructions for Fluent Column API

Always reference the Column API and Table API specifications for more details.

1. Define typed columns inside the `schema` object of a `Table()` declaration.
2. Import only the column functions you use from `@servicenow/sdk/core`.
3. Use Fluent column option names exactly as specified (for example `maxLength`, `readOnly`, `mandatory`, `attributes`).
4. For SDK 4.2+ column helpers, use `Duration()`, `Time()`, `FieldList()`, and `TemplateValue()` with matching column types.
5. Use `Now.attach('path/to/image.png')` only for image-compatible defaults such as `BasicImageColumn`.
6. **SDK v4.12.1** — column-level `hint`, `help` and `plural` are now written to the column's documentation record (sys_documentation) (earlier builds silently dropped them). Set them on the column config for a single-language column; use a `label: Documentation[]` entry only when a language needs different text.
7. **SDK v4.12.0** — `UrlColumn` accepts any string, not only absolute `http://`/`https://` URLs, so a relative default such as `'sn_appstore_store.do'` is valid.
