# Function: TimeColumn(config)

A Column for a time field.
Represents a time of day with hours, minutes, and seconds.

## Usage

```typescript
const startTime = TimeColumn({
    label: 'Start Time',
    default: time({ hours: 9, minutes: 0, seconds: 0 }),
})

const endTime = TimeColumn({
    label: 'End Time',
    default: '1970-01-01 17:30:00',
})
```
## Parameters

### config

`C & TimeColumnType<Type, Default>`

an object that can include all base `Column` properties

**Properties:**

- **active** (optional): `boolean`
  Indicates whether to display the field in list and forms

- **array** (optional): `boolean`
  Creates another table to store the info that will be captured by this field

- **attributes** (optional): `Record<string, string | number | boolean>`
  Pairs of any supported dictionary attributes (sys_schema_attribute)

- **audit** (optional): `boolean`
  Indicates whether to track the creation, update, and deletion of all records in the table.

- **default** (optional): `Default | string`
  Default value of the field when creating a record

- **dependent** (optional): `string`
  limit the values available to select based on the value of the dependent field

- **elementReference** (optional): `boolean`
  Indicates if the value of this field connotes the "element type"

- **functionDefinition** (optional): `string`
  Definition of a function that the field performs

- **help** (optional): `string`
  Help information for the field

- **hint** (optional): `string`
  Describes field in more verbose form

- **label** (optional): `string | Documentation[]`
  Unique label for the column that appears on list headers and form fields

- **mandatory** (optional): `boolean`
  Indicates whether the field must contain a value to save a record

- **maxLength** (optional): `number | string`
  Maximum length of the field value

- **plural** (optional): `string`
  Plural form of the field name

- **primary** (optional): `boolean`
  Indicates the primary key for a table

- **readOnly** (optional): `boolean`
  Indicates whether you can edit the field value

- **readOnlyOption** (optional): `readOnlyOptionType`
  Specifies the read-only behavior for the field

- **spellCheck** (optional): `boolean`
  Enables spell check for this field

- **tableReference** (optional): `boolean`
  Indicates if the value of this field is a reference to another table in the schema

- **textIndex** (optional): `boolean`
  Enables a natural language search on this field

- **unique** (optional): `boolean`
  Creates a unique index on this field

- **widget** (optional): `string`
  Style for the element type such as "radio"

- **xmlView** (optional): `boolean`
  Displays the field value as XML


## See

- https://docs.servicenow.com/csh?topicname=table-api-now-ts.html&version=latest

