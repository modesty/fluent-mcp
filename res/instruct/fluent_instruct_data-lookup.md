# Instructions for Fluent DataLookup API
Always reference the DataLookup API specifications for more details.
1. Import `DataLookup` from `@servicenow/sdk/core`. The `$id` field is mandatory and must be unique, typically using `Now.ID['value']`. `name` is mandatory and must be 40 characters or fewer.
2. Use a Data Lookup to **automatically populate fields** on a record by copying values from a matching row in a lookup table — the classic example is deriving `priority` from `impact` + `urgency`, or copying location/department defaults onto a task.
3. Create the **matcher table first** with `Table({ extends: 'dl_matcher', ... })`, in the **same scope** as the Data Lookup definition. Reference it via `matcherTable`. A cross-scope matcher or source table is a build error.
4. The `sourceTable` is the table whose records trigger the lookup and receive copied values. To target an OOB table like `incident`, use a global-scope app or a scoped table that extends it.
5. Define `matchRules` to express *when* the lookup fires: each rule compares a `sourceField` against a `matcherField`. **All** match rules must pass. With `exactMatch: true` the values must be identical; `false` allows partial/range matching by field type. Omitting `matchRules` matches all records.
6. Define `setRules` to express *what* gets copied: each rule writes the matcher's `matcherField` into the source's `targetField`. Set `alwaysReplace: true` to overwrite existing values, or leave it `false` to fill only empty fields. Omitting `setRules` copies nothing.
7. Mind the run triggers: `runOnInsert` and `runOnFormChange` default to `true`, but `runOnUpdate` defaults to **`false`** — explicitly set `runOnUpdate: true` if the lookup must fire when records are edited.
8. Ensure every seed row in the matcher table has `active = true`. The engine queries the matcher table with an implicit `active=true` filter, so inactive/null rows never match.
9. Set `protectionPolicy: 'read'` or `'protected'` to limit how other developers can change the definition after install; omit it to allow full customization.
