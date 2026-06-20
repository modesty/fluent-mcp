# **Context:** DataLookup API spec (SDK v4.8.0+): Creates a Data Lookup definition (`dl_definition`) that **automatically copies field values** from a matching record (the *matcher*) to a target record (the *source*) when configurable match conditions are met — e.g. derive `impact`/`urgency` from a `priority` lookup table. Each match rule becomes a `dl_definition_rel_match` row; each set rule a `dl_definition_rel_set` row. The matcher table must extend `dl_matcher` and be created separately with `Table()`.

```typescript
// Creates a new Data Lookup definition (`dl_definition`). Import from '@servicenow/sdk/core'.
DataLookup({
 $id: '', // NowId (string | number | guid), mandatory - stable identifier; prevents duplicates across builds
 name: '', // string, mandatory - display name, must be 40 characters or fewer (longer => build error)
 sourceTable: '', // S extends TableName, mandatory - table whose records TRIGGER the lookup and RECEIVE copied values.
   // In a scoped app must be in the same scope as the definition; for OOB tables (incident/problem) use a global app or a scoped extension table
 matcherTable: '', // M extends TableName, mandatory - custom table whose rows are searched for a match.
   // MUST extend `dl_matcher` and be created separately via Table() before deploy. Must be in the SAME scope as the definition
 active: true, // boolean, optional (default true) - whether the definition is evaluated during record operations
 runOnInsert: true, // boolean, optional (default true) - run when a source record is inserted
 runOnUpdate: false, // boolean, optional (default FALSE) - run when a source record is updated. Default false is a common gotcha
 runOnFormChange: true, // boolean, optional (default true) - run on form change (client-side evaluation)
 protectionPolicy: 'read', // 'read' | 'protected', optional - 'read' allows view but not edit; 'protected' blocks edits; omit for full customization
 matchRules: [ // DataLookupMatchRule<S, M>[], optional - ALL must pass for the lookup to trigger. When omitted, all records match
   {
     $id: '', // NowId, mandatory - stable id; stored as its own `dl_definition_rel_match` record
     sourceField: '', // keyof FullSchema<S> | SystemColumns | string, mandatory - field on the SOURCE table to compare
     matcherField: '', // keyof FullSchema<M> | SystemColumns | string, mandatory - field on the MATCHER table to compare against
     exactMatch: true, // boolean, optional (default false) - true requires exact match; false allows partial/range matching by field type
   },
 ],
 setRules: [ // DataLookupSetRule<S, M>[], optional - fields copied from matcher to source when the lookup applies. When omitted, nothing is copied
   {
     $id: '', // NowId, mandatory - stable id; stored as its own `dl_definition_rel_set` record
     targetField: '', // keyof FullSchema<S> | SystemColumns | string, mandatory - field on the SOURCE table to write into
     matcherField: '', // keyof FullSchema<M> | SystemColumns | string, mandatory - field on the MATCHER table to read from
     alwaysReplace: false, // boolean, optional (default false) - true always overwrites; false only sets when the target is empty
   },
 ],
}): DataLookup // returns a DataLookup object

// Seed-data requirement: each matcher-table row MUST have `active = true` — the engine queries with an implicit `active=true`
// filter, so rows where active is null/false never match.
```
