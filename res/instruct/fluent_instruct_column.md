# Instructions for Fluent Column API

Always reference the Column API and Table API specifications for more details.

1. Define typed columns inside the `schema` object of a `Table()` declaration.
2. Import only the column functions you use from `@servicenow/sdk/core`.
3. Use Fluent column option names exactly as specified (for example `maxLength`, `readOnly`, `mandatory`, `attributes`).
4. For SDK 4.2+ column helpers, use `Duration()`, `Time()`, `FieldList()`, and `TemplateValue()` with matching column types.
5. Use `Now.attach('path/to/image.png')` only for image-compatible defaults such as `BasicImageColumn`.
6. **SDK v4.12.1** — column-level `hint`, `help` and `plural` are now written to the column's documentation record (sys_documentation) (earlier builds silently dropped them). Set them on the column config for a single-language column; use a `label: Documentation[]` entry only when a language needs different text.
7. **SDK v4.12.0** — `UrlColumn` accepts any string, not only absolute `http://`/`https://` URLs, so a relative default such as `'sn_appstore_store.do'` is valid.
8. **SDK v4.14.0 — field-level roles.** Every column type (not `OverrideColumn`) accepts `createRoles`, `readRoles`, `writeRoles` and `deleteRoles`, each a `(string | Role)[]` written to the column's dictionary entry as comma-separated role names. Prefer passing the app's `Role()` records over bare strings, and use one array entry per role: a role string containing a comma is a build error.
9. **SDK v4.14.0 — denormalized arrays.** `arrayDenormalized: true` keeps the off-row array table and also stores the values on the parent row as a comma-separated string. Always set it together with `array: true`. Omitting `array` only raises a build hint that is never printed: the bootstrap still writes `array="denormalized"`, but the sys_dictionary record gets a contradictory array=false / array_denormalized=true pair.
10. **SDK v4.14.0 — `referenceQualCondition`** on `ReferenceColumn` and `ListColumn` holds the condition-builder ('simple') value of the reference qualifier as an encoded query. Write it in camelCase: the snake_case spelling reference_qual_condition is not an alias and is silently dropped. It does not change the derived `useReferenceQualifier` mode — `dynamicRefQual` still implies 'dynamic' and `referenceQual` 'advanced', otherwise 'simple'.
11. **Release-note corrections (SDK v4.14.0).** `arrayDenormalized` is declared on the base column config, so every column type accepts it, not only array columns — and it does not require `array: true` at the type level (see 9). `referenceQualCondition` is new only for table columns: the catalog `ReferenceVariable` already had a property of that name.
