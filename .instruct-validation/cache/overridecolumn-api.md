
# Function: OverrideColumn(config)

Define a dictionary override for an inherited column.

Use to modify properties of a column inherited from a parent table

## Usage

```typescript
// Make priority mandatory in incident table
export const incident = Table({
    name: 'incident',
    extends: 'task',
    schema: {
        priority: OverrideColumn({
            baseTable: 'task',
            mandatory: true,
        }),
        // Make state field read-only in the UI
        state: OverrideColumn({
            baseTable: 'task',
            readOnlyOption: 'display_read_only',
        }),
    },
})
```
## Parameters

### config

`OverrideColumnType`

an object that can include all `OverrideColumnType` properties

**Properties:**

- **attributes** (optional): `Record<string, string | number | boolean>`
  Pairs of any supported dictionary attributes (sys_schema_attribute).

- **baseTable** (optional): `TableName`
  Specifies the table where this column is originally defined. If not specified, defaults to the table in 'extends'.

- **calculation** (optional): `string`
  Override the calculation script for calculated fields.

- **default** (optional): `string`
  Override the default value for this field.

- **dependent** (optional): `string`
  Override the dependent field setting.

- **display** (optional): `boolean`
  Whether the field should be displayed in the UI.

- **mandatory** (optional): `boolean`
  Override whether the field is mandatory.

- **readOnlyOption** (optional): `readOnlyOptionType`
  Override the read-only option for this field. Controls how the field can be modified.

  Options:
  - `'display_read_only'` - Field is read-only in the UI but can be updated by server-side scripts and APIs
  - `'client_script_modifiable'` - Field can only be updated by client scripts (prevents manual editing and server-side updates)
  - `'strict_read_only'` - Field cannot be updated from anywhere (UI, client scripts, server scripts, or APIs)
  - `'instance_configured'` - Behavior is determined by the system property `glide.read_only.legacy_read_only_behavior` (defaults to `client_script_modifiable`)

- **referenceQualifier** (optional): `string`
  Override the reference qualifier for reference fields.


## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest

