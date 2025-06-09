#**Context:** Property spec: Used to create a system property. Works closely with Role API to define read and write access at the property level.
```typescript
/// Creates a new Property (`sys_property`)
Property({
    $id: '', // string | guid, mandatory
    name: '', // string, mandatory
    value: '', // string
    type: '', // 'string' | 'integer' | 'boolean' | 'choicelist' | 'color' | 'date_format' | 'image' | password' | 'password2' | 'short_string' | 'time_format' | 'timezone' | 'uploaded_image', mandatory
    description: '', // string
    choices: [], // array, only applies if `type === choicelist`, for example: `['Blue=0000FF', 'Red=FF0000', 'Green=00FF00']`
    roles: {
      read: [], // array of role names | Role objects for property read access, for example ['admin', 'itil_user']
      write: [], // array of role names | Role objects for property write access, for example ['admin', 'itil_user']
    },
    ignoreCache: false, // boolean, indicates whether to flush the cache after `value` is changed
    isPrivate: false, // boolean, indicates whether to include property in update sets			
}): Property // returns a Property object
```
