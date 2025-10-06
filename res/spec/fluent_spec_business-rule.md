# **Context**: Business Rule spec: Used to create a new Business Rule in ServiceNow, its `script` property defines the business logic, `table` property defines the table to which the Business Rule applies

```typescript
// Creates a new Business Rule (`sys_script`)
BusinessRule({
 $id: '', // string | guid, mandatory
 name: '', // string, mandatory
 table: '', // string, mandatory
 condition: '', // string, condition string that must be true for BusinessRule to run, for example: `current.parent !== 'NULL'`
 when: 'before', // 'before' | 'after' | 'async' | 'display', mandatory
 abortAction: false, // boolean
 action: [], // ("insert" | "update" | "delete" | "query")[]
 active: false, // boolean
 addMessage: false, // boolean
 description: '', // string
 filterCondition: '', // ServiceNow encoded query
 message: '', // string
 order: 100, // number
 roleConditions: [], // array of string | array of Role objects indicating that the user needs to have all Roles listed to execute this Business Rule, see Role spec
 script: '', // ServiceNow script to fullfil the functional request in scripting,
 setFieldValue: '', // string, sets a field name to a value, for example `name='new_name'`
}): BusinessRule // returns a BusinessRule object
```
