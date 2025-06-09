#**Context:** User Preference API spec: User Preferences are used to manage user's preferences for applications and their features.
```typescript
// spec to create UserPreference in Fluent
UserPreference({
    $id: '', // string | guid, mandatory
    name: '', // string, name of the feature or functionality
    type: 'boolean', // string, the data type of entry accepted for the `value`: `string`|`integer`|`boolean`|`choicelist`|`color`|`date_format`|`image`|`password`|`password2`|`short_string`|`time_format`|`timezone`|`uploaded_image`
    value: false, // current setting for this record, type is based on `type` field 
    description: '', // optional, string, short description of the feature or functionality
    system: true // optional, boolean, whether this record indicates the system-wide default, default true
})
```
