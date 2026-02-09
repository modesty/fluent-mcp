# **Context:** ImportSet API spec: Used to create an Import Set transform map that defines how rows in a staging/source table are transformed and loaded into a target table (`sys_transform_map`).

```typescript
// Creates a new Import Set transform map (`sys_transform_map`)
ImportSet({
 $id: '', // string | guid, mandatory - unique identifier for the record
 name: '', // string, mandatory - display name of the import set
 targetTable: '', // string, mandatory - target table to insert/update records (e.g., 'incident')
 sourceTable: '', // string, mandatory - staging/source table holding raw rows (e.g., 'u_import_incidents')
 order: 100, // number, optional - execution order; lower numbers run first
 active: true, // boolean, optional - whether the import set is enabled
 runBusinessRules: false, // boolean, optional - whether to run business rules on the target table
 enforceMandatoryFields: 'no', // 'no' | 'onlyMappedFields' | 'allFields', optional
   // 'no': do not enforce target table mandatory fields during transform
   // 'onlyMappedFields': enforce mandatory only for fields mapped in `fields`
   // 'allFields': enforce all target table mandatory fields; unmapped required fields must still be provided or the row will be rejected
 copyEmptyFields: false, // boolean, optional - whether empty source values overwrite target values
 createOnEmptyCoalesce: false, // boolean, optional - insert a new record when no coalesce match is found
 fields: {}, // object, optional - field mappings: target field name -> source field name (string) or configuration object
   // Simple string mapping: { target_field: 'source_field' }
   // Advanced mapping object:
   //   sourceField: '', // string, optional - name of the source column
   //   choiceAction: 'reject', // 'reject' | 'ignore' | 'create', optional - how to handle unmapped choice values
   //   dateFormat: 'yyyy-MM-dd', // DateFormat, optional - parse dates using a specific format
   //     // Valid formats: 'dd-MM-yyyy' | 'yyyy-MM-dd' | 'yyyy-dd-MM' | 'MM-dd-yyyy HH:mm:ss z' | 'yyyy-MM-dd HH:mm:ss' | 'HH:mm:ss' | 'MM-dd-yyyy HH:mm:ss' | 'dd-MM-yyyy HH:mm:ss z' | 'MM-dd-yyyy' | 'dd-MM-yyyy HH:mm:ss'
   //   referenceValueField: '', // string, optional - alternate source column to resolve reference values
   //   useSourceScript: false, // boolean, optional - enable a per-field transform script
   //   sourceScript: '', // function | string, optional - function (source) => string or string script executed before mapping
   //   coalesce: false, // boolean, optional - mark this as a match key for updates (upsert behavior)
   //   coalesceCaseSensitive: false, // boolean, optional - whether coalesce matching is case sensitive
   //   coalesceEmptyFields: false, // boolean, optional - whether to coalesce on empty field values
 scripts: [], // ImportSetScript[], optional - array of transform scripts for lifecycle hooks
   // Each script object:
   //   $id: '', // string | guid, mandatory - unique identifier for the script
   //   active: true, // boolean, optional - whether this script runs
   //   order: 100, // number, optional - script execution order
   //   when: 'onBefore', // ScriptTiming, optional - lifecycle timing
   //     // Valid values: 'onBefore' | 'onAfter' | 'onReject' | 'onStart' | 'onForeignInsert' | 'onComplete' | 'onChoiceCreate'
   //   script: '', // function | string, optional - script body: function(source, map, log, target) or string
 runScript: false, // boolean, optional - whether to run a top-level map script
 script: '', // function | string, optional - top-level map script when runScript is true
   // function signature: (source, target, map, log, isUpdate) => void
}): ImportSet // returns an ImportSet object
```
