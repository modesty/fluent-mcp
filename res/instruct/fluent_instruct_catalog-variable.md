# Instructions for Fluent Catalog Variable API
Always reference the Catalog Variable API specification for more details.
1. Variable functions are used as values in the `variables` object of a `VariableSet` or `CatalogItem`. The object key becomes the variable's internal name, used in `g_form` calls and `producer.varName` scripts.
2. `question` is the only property that is mandatory across all variable types. It is the label/question text shown to the user on the form.
3. `mandatory`, `hidden`, and `readOnly` are mutually exclusive constraints — a variable cannot be both `mandatory: true` and `hidden: true` (or `readOnly: true`). Doing so causes a build error.
4. Use `ReferenceVariable` (not `SelectBoxVariable`) when the choices come from another table. `ReferenceVariable` requires `referenceTable` and supports filter qualifiers. Use `LookupSelectBoxVariable` for a reference field displayed as a dropdown.
5. For `ReferenceVariable`, use `referenceQualCondition` for simple encoded query filters (e.g., `'active=true'`), `dynamicRefQual` for a `sys_filter_option_dynamic` reference, and `referenceQual` for advanced script-based qualifiers.
6. Layout variables (`ContainerStartVariable`, `ContainerSplitVariable`, `ContainerEndVariable`, `BreakVariable`, `LabelVariable`, `RichTextLabelVariable`, `HtmlVariable`) do not collect user input — they control form presentation only.
7. `ContainerStartVariable` must always have a matching `ContainerEndVariable` with higher `order` value. Use `ContainerSplitVariable` to create sections within a container.
8. Variable display `order` values should be spaced (100, 200, 300...) to allow inserting variables between existing ones without renumbering.
9. `mapToField: true` with a `field` value automatically maps the variable's value to a specific field on the target record — useful in Record Producers to avoid manual mapping in the `script` property.
10. `width` controls how much horizontal space the variable occupies: 25%, 50%, 75%, or 100% (default). Use narrower widths in two-column layouts.
